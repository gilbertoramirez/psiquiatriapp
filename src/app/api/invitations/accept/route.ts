import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import { getPasswordStore } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token requerido' }, { status: 400 });
  }

  const invitation = db.invitations.find(inv => inv.token === token && inv.status === 'pending');
  if (!invitation) {
    return NextResponse.json({ valid: false, error: 'Invitación inválida o ya utilizada' }, { status: 404 });
  }

  const patient = db.patients.find(p => p.id === invitation.patientId);
  if (!patient) {
    return NextResponse.json({ valid: false, error: 'Paciente no encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    patientName: patient.name,
    patientEmail: patient.email,
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

    const invitation = db.invitations.find(inv => inv.token === token && inv.status === 'pending');
    if (!invitation) {
      return NextResponse.json({ error: 'Invitación inválida o ya utilizada' }, { status: 404 });
    }

    const patient = db.patients.find(p => p.id === invitation.patientId);
    if (!patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const hash = await hashPassword(password);
    getPasswordStore().set(patient.id, hash);

    patient.accountStatus = 'active';
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();

    const jwtToken = generateToken(patient);
    return NextResponse.json({
      token: jwtToken,
      user: { id: patient.id, name: patient.name, email: patient.email, role: patient.role },
    });
  } catch {
    return NextResponse.json({ error: 'Error al aceptar invitación' }, { status: 500 });
  }
}
