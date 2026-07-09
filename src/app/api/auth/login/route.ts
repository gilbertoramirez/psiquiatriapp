import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    const patient = await prisma.patient.findUnique({ where: { email } });
    const doctor = await prisma.doctor.findUnique({ where: { email } });
    const user = patient || doctor;

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    if (patient && patient.accountStatus === 'pending') {
      return NextResponse.json({ error: 'Tu cuenta aún no ha sido activada. Usa el enlace de invitación enviado por tu doctora.' }, { status: 403 });
    }

    const passwordHash = patient?.passwordHash || doctor?.passwordHash;
    if (!passwordHash) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const role = doctor ? 'doctor' : 'patient';
    const token = generateToken({ id: user.id, email: user.email, role, name: user.name });
    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role },
    });
  } catch {
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 });
  }
}
