import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { PatientLog } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

// GET patient list (for doctors) or patient logs
export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const patientId = searchParams.get('patientId');

  if (user.role === 'doctor') {
    if (type === 'logs' && patientId) {
      const logs = db.patientLogs.filter(l => l.patientId === patientId && l.doctorId === user.id);
      return NextResponse.json(logs);
    }

    if (type === 'list') {
      // Get unique patients that have appointments with this doctor
      const patientIds = [...new Set(db.appointments.filter(a => a.doctorId === user.id).map(a => a.patientId))];
      const patients = db.patients.filter(p => patientIds.includes(p.id));
      return NextResponse.json(patients);
    }

    // Dashboard stats
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const myAppointments = db.appointments.filter(a => a.doctorId === user.id);
    const todayAppts = myAppointments.filter(a => a.date === today);
    const weekAppts = myAppointments.filter(a => a.date >= today && a.date <= weekEndStr);
    const patientIds = [...new Set(myAppointments.map(a => a.patientId))];

    return NextResponse.json({
      totalPatients: patientIds.length,
      todayAppointments: todayAppts.length,
      weekAppointments: weekAppts.length,
      pendingPayments: myAppointments.filter(a => a.paymentStatus === 'pending').length,
      completedToday: todayAppts.filter(a => a.status === 'completed').length,
    });
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

// POST - create patient log entry
export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const { patientId, mood, symptoms, notes, treatment, progress, appointmentId } = await request.json();

    const log: PatientLog = {
      id: `log-${uuidv4()}`,
      patientId,
      doctorId: user.id,
      date: new Date().toISOString(),
      appointmentId,
      mood: mood || 5,
      symptoms: symptoms || [],
      notes: notes || '',
      treatment: treatment || '',
      progress: progress || 'stable',
    };

    db.patientLogs.push(log);
    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}
