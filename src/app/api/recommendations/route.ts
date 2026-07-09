import { NextRequest, NextResponse } from 'next/server';
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

  const recommendations = await prisma.recommendation.findMany({
    where: user.role === 'doctor' ? { doctorId: user.id } : { patientId: user.id },
    include: { doctor: { select: { name: true } } },
  });

  const result = recommendations.map(r => ({
    id: r.id,
    patientId: r.patientId,
    doctorId: r.doctorId,
    date: r.date,
    title: r.title,
    description: r.description,
    steps: r.steps,
    category: r.category,
    priority: r.priority,
    doctorName: r.doctor.name,
  }));

  return NextResponse.json(result);
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

    const recommendation = await prisma.recommendation.create({
      data: {
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
      },
    });

    return NextResponse.json(recommendation, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear recomendación' }, { status: 500 });
  }
}
