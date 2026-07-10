import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/create-notification';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

const dayNames: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { appointmentId, newDate, newStartTime, newModality } = await request.json();

    if (!appointmentId || !newDate || !newStartTime) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const isPatient = user.role === 'patient' && appointment.patientId === user.id;
    const isDoctor = user.role === 'doctor' && appointment.doctorId === user.id;
    if (!isPatient && !isDoctor) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (isPatient) {
      const aptDate = new Date(`${appointment.date}T${appointment.startTime}`);
      const hoursUntil = (aptDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil <= 24) {
        return NextResponse.json({ error: 'No puedes modificar con menos de 24 horas de anticipación' }, { status: 400 });
      }
    }

    const newAppointmentDate = new Date(newDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newAppointmentDate < today) {
      return NextResponse.json({ error: 'No puede reagendar a una fecha pasada' }, { status: 400 });
    }

    const dayOfWeek = newAppointmentDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const availableHours = appointment.doctor.availableHours as Record<string, { start: string; end: string }[]>;
    const availableSlots = availableHours[dayName];

    if (!availableSlots || availableSlots.length === 0) {
      return NextResponse.json({ error: 'La doctora no atiende ese día' }, { status: 400 });
    }

    const timeInMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = timeInMinutes(newStartTime);
    const isValidTime = availableSlots.some(
      (slot: { start: string; end: string }) => startMinutes >= timeInMinutes(slot.start) && startMinutes < timeInMinutes(slot.end)
    );

    if (!isValidTime) {
      return NextResponse.json({ error: 'Horario no disponible' }, { status: 400 });
    }

    const newEndTime = `${String(Math.floor((startMinutes + 60) / 60)).padStart(2, '0')}:${String((startMinutes + 60) % 60).padStart(2, '0')}`;

    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId: appointment.doctorId,
        date: newDate,
        startTime: newStartTime,
        status: { not: 'cancelled' },
        id: { not: appointmentId },
      },
    });

    if (conflict) {
      return NextResponse.json({ error: 'Este horario ya está ocupado' }, { status: 409 });
    }

    const oldDateStr = `${appointment.date} a las ${appointment.startTime}`;
    const newDateStr = `${newDate} a las ${newStartTime}`;

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        modality: newModality || appointment.modality,
        reminderSent: false,
      },
      include: { doctor: { select: { name: true } }, patient: { select: { name: true } } },
    });

    if (isPatient) {
      await createNotification({
        userId: appointment.doctorId,
        userRole: 'doctor',
        type: 'reschedule',
        title: 'Cita reagendada',
        message: `${appointment.patient.name} reagendó su cita de ${oldDateStr} a ${newDateStr}.`,
      });
    } else {
      await createNotification({
        userId: appointment.patientId,
        userRole: 'patient',
        type: 'reschedule',
        title: 'Cita reagendada',
        message: `Tu doctora reagendó tu cita de ${oldDateStr} a ${newDateStr}.`,
      });
    }

    return NextResponse.json({
      ...updated,
      doctorName: updated.doctor.name,
      patientName: updated.patient.name,
    });
  } catch {
    return NextResponse.json({ error: 'Error al reagendar cita' }, { status: 500 });
  }
}
