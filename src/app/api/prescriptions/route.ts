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
    prescriptions = await db.prescriptions.findByDoctorId(user.id);
  } else {
    prescriptions = await db.prescriptions.findByPatientId(user.id);
  }

  const doctors = await db.doctors.findAll();
  const doctorMap = new Map(doctors.map(d => [d.id, d.name]));

  return NextResponse.json(prescriptions.map(p => ({
    ...p,
    doctorName: doctorMap.get(p.doctorId) || 'Doctor',
  })));
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

    await db.prescriptions.create(prescription);
    return NextResponse.json(prescription, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear receta' }, { status: 500 });
  }
}
