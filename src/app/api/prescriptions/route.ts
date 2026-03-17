import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { Prescription } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let prescriptions: Prescription[];
  if (user.role === 'doctor') {
    prescriptions = db.prescriptions.filter(p => p.doctorId === user.id);
  } else {
    prescriptions = db.prescriptions.filter(p => p.patientId === user.id);
  }

  prescriptions = prescriptions.map(p => ({
    ...p,
    doctorName: db.doctors.find(d => d.id === p.doctorId)?.name || 'Doctor',
  }));

  return NextResponse.json(prescriptions);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores pueden crear recetas' }, { status: 403 });

  try {
    const { patientId, medications, diagnosis, notes, appointmentId } = await request.json();

    if (!patientId || !medications || !diagnosis) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const prescription: Prescription = {
      id: `rx-${uuidv4()}`,
      patientId,
      doctorId: user.id,
      appointmentId,
      date: new Date().toISOString(),
      medications,
      diagnosis,
      notes,
    };

    db.prescriptions.push(prescription);
    return NextResponse.json(prescription, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear receta' }, { status: 500 });
  }
}
