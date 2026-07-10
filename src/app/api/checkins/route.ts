import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);

  if (user.role === 'patient') {
    const checkIns = await prisma.patientCheckIn.findMany({
      where: { patientId: user.id },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(checkIns);
  }

  if (user.role === 'doctor') {
    const patientId = searchParams.get('patientId');
    if (!patientId) return NextResponse.json({ error: 'patientId requerido' }, { status: 400 });

    const checkIns = await prisma.patientCheckIn.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(checkIns);
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'patient') return NextResponse.json({ error: 'Solo pacientes' }, { status: 403 });

  try {
    const { mood, sleep, sleepQuality, anxiety, energy, sideEffects, notes } = await request.json();
    const date = new Date().toISOString().split('T')[0];

    const existing = await prisma.patientCheckIn.findFirst({
      where: { patientId: user.id, date },
    });
    if (existing) return NextResponse.json({ error: 'Ya existe un check-in para hoy' }, { status: 409 });

    const checkIn = await prisma.patientCheckIn.create({
      data: {
        patientId: user.id,
        date,
        mood,
        sleep,
        sleepQuality,
        anxiety,
        energy,
        sideEffects,
        notes,
      },
    });

    return NextResponse.json(checkIn, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear check-in' }, { status: 500 });
  }
}
