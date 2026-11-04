import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { Recommendation } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let recommendations: Recommendation[];
  if (user.role === 'doctor') {
    recommendations = await db.recommendations.findByDoctorId(user.id);
  } else {
    recommendations = await db.recommendations.findByPatientId(user.id);
  }

  const doctors = await db.doctors.findAll();
  const doctorMap = new Map(doctors.map(d => [d.id, d.name]));

  return NextResponse.json(recommendations.map(r => ({
    ...r,
    doctorName: doctorMap.get(r.doctorId) || 'Doctor',
  })));
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores pueden crear recomendaciones' }, { status: 403 });

  try {
    const { patientId, title, description, steps, category, priority } = await request.json();

    if (!patientId || !title || !description) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const recommendation: Recommendation = {
      id: `rec-${uuidv4()}`,
      patientId,
      doctorId: user.id,
      date: new Date().toISOString(),
      title,
      description,
      steps: (steps || []).map((s: { description: string }, i: number) => ({
        order: i + 1,
        description: s.description,
        completed: false,
      })),
      category: category || 'other',
      priority: priority || 'medium',
    };

    await db.recommendations.create(recommendation);
    return NextResponse.json(recommendation, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear recomendación' }, { status: 500 });
  }
}
