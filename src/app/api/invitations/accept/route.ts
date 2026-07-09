import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 });
  }

  const invitation = await prisma.invitation.findFirst({
    where: { token, status: 'pending' },
    include: { patient: { select: { name: true, email: true } } },
  });

  if (!invitation) {
    return NextResponse.json({ valid: false, error: 'Invitación inválida o ya utilizada' }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    patientName: invitation.patient.name,
    patientEmail: invitation.patient.email,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token y contraseña son requeridos' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { token, status: 'pending' },
      include: { patient: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación inválida o ya utilizada' }, { status: 404 });
    }

    const passwordHash = await hashPassword(password);

    const patient = await prisma.$transaction(async (tx) => {
      const p = await tx.patient.update({
        where: { id: invitation.patientId },
        data: { passwordHash, accountStatus: 'active' },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt: new Date() },
      });

      return p;
    });

    const jwtToken = generateToken({ id: patient.id, email: patient.email, role: 'patient', name: patient.name });
    return NextResponse.json({
      token: jwtToken,
      user: { id: patient.id, name: patient.name, email: patient.email, role: 'patient' },
    });
  } catch {
    return NextResponse.json({ error: 'Error al aceptar invitación' }, { status: 500 });
  }
}
