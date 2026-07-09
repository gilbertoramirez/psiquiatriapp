import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { Patient, Invitation } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  const invitations = db.invitations
    .filter(inv => inv.doctorId === user.id)
    .map(inv => {
      const patient = db.patients.find(p => p.id === inv.patientId);
      return { ...inv, patientName: patient?.name, patientPhone: patient?.phone };
    });

  return NextResponse.json(invitations);
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

    const existingPatient = db.patients.find(p => p.email === email);
    const existingDoctor = db.doctors.find(d => d.email === email);
    if (existingPatient || existingDoctor) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });
    }

    const patientId = `pat-${uuidv4()}`;
    const patient: Patient = {
      id: patientId,
      email,
      name,
      role: 'patient',
      phone: phone || '',
      createdAt: new Date().toISOString(),
      accountStatus: 'pending',
    };
    db.patients.push(patient);

    const token = uuidv4();
    const invitation: Invitation = {
      id: `inv-${uuidv4()}`,
      token,
      patientId,
      doctorId: user.id,
      email,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    db.invitations.push(invitation);

    return NextResponse.json({
      invitation,
      patient,
      invitationUrl: `/invitacion/${token}`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear invitación' }, { status: 500 });
  }
}
