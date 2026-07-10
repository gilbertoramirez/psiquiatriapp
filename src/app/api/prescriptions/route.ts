import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/create-notification';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const prescriptions = await prisma.prescription.findMany({
    where: user.role === 'doctor' ? { doctorId: user.id } : { patientId: user.id },
    include: { doctor: { select: { name: true } } },
  });

  const result = prescriptions.map(p => ({
    id: p.id,
    patientId: p.patientId,
    doctorId: p.doctorId,
    appointmentId: p.appointmentId,
    date: p.date,
    medications: p.medications,
    diagnosis: p.diagnosis,
    notes: p.notes,
    doctorName: p.doctor.name,
  }));

  return NextResponse.json(result);
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

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId: user.id,
        appointmentId,
        date: new Date().toISOString(),
        medications,
        diagnosis,
        notes,
      },
    });

    await createNotification({
      userId: patientId,
      userRole: 'patient',
      type: 'prescription',
      title: 'Nueva receta',
      message: 'Tu doctora te ha creado una nueva receta médica.',
    });

    return NextResponse.json(prescription, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear receta' }, { status: 500 });
  }
}
