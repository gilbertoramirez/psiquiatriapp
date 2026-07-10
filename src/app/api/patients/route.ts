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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const patientId = searchParams.get('patientId');

  if (user.role === 'doctor') {
    if (type === 'logs' && patientId) {
      const logs = await prisma.patientLog.findMany({
        where: { patientId, doctorId: user.id },
      });
      return NextResponse.json(logs);
    }

    if (type === 'list') {
      const [appointments, doctorInvitations] = await Promise.all([
        prisma.appointment.findMany({
          where: { doctorId: user.id },
          select: { patientId: true },
          distinct: ['patientId'],
        }),
        prisma.invitation.findMany({
          where: { doctorId: user.id },
          select: { patientId: true },
        }),
      ]);
      const patientIds = [...new Set([
        ...appointments.map(a => a.patientId),
        ...doctorInvitations.map(i => i.patientId),
      ])];
      const patients = await prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: {
          id: true, email: true, name: true, phone: true,
          dateOfBirth: true, emergencyContact: true, emergencyPhone: true,
          medicalHistory: true, accountStatus: true, createdAt: true,
        },
      });
      return NextResponse.json(patients);
    }

    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const [todayCount, weekCount, pendingCount, completedCount, patientCount] = await Promise.all([
      prisma.appointment.count({ where: { doctorId: user.id, date: today } }),
      prisma.appointment.count({ where: { doctorId: user.id, date: { gte: today, lte: weekEndStr } } }),
      prisma.appointment.count({ where: { doctorId: user.id, paymentStatus: 'pending' } }),
      prisma.appointment.count({ where: { doctorId: user.id, date: today, status: 'completed' } }),
      prisma.appointment.findMany({
        where: { doctorId: user.id },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
    ]);

    return NextResponse.json({
      totalPatients: patientCount.length,
      todayAppointments: todayCount,
      weekAppointments: weekCount,
      pendingPayments: pendingCount,
      completedToday: completedCount,
    });
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const { patientId, mood, symptoms, notes, treatment, progress, appointmentId, soapNotes } = await request.json();

    const log = await prisma.patientLog.create({
      data: {
        patientId,
        doctorId: user.id,
        date: new Date().toISOString(),
        appointmentId,
        mood: mood || 5,
        symptoms: symptoms || [],
        notes: notes || '',
        treatment: treatment || '',
        progress: progress || 'stable',
        soapNotes: soapNotes || undefined,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}
