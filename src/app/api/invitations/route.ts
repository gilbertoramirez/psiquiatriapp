import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  const invitations = await prisma.invitation.findMany({
    where: { doctorId: user.id },
    include: { patient: { select: { name: true, phone: true } } },
  });

  const result = invitations.map(inv => ({
    id: inv.id,
    token: inv.token,
    patientId: inv.patientId,
    doctorId: inv.doctorId,
    email: inv.email,
    status: inv.status,
    createdAt: inv.createdAt,
    acceptedAt: inv.acceptedAt,
    patientName: inv.patient.name,
    patientPhone: inv.patient.phone,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const { name, email, phone } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 });
    }

    const existingPatient = await prisma.patient.findUnique({ where: { email } });
    const existingDoctor = await prisma.doctor.findUnique({ where: { email } });
    if (existingPatient || existingDoctor) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
    }

    const token = uuidv4();

    const [patient, invitation] = await prisma.$transaction(async (tx) => {
      const p = await tx.patient.create({
        data: {
          email,
          name,
          phone: phone || '',
          accountStatus: 'pending',
        },
      });

      const inv = await tx.invitation.create({
        data: {
          token,
          patientId: p.id,
          doctorId: user.id,
          email,
        },
      });

      return [p, inv] as const;
    });

    return NextResponse.json({
      invitation,
      patient,
      invitationUrl: `/invitacion/${token}`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear invitación' }, { status: 500 });
  }
}
