import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/create-notification';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { appointmentId, reason } = await request.json();

    if (!appointmentId || !reason) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    if (user.role === 'patient') {
      if (appointment.patientId !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const appointmentDate = new Date(`${appointment.date}T${appointment.startTime}`);
      const hoursUntil = (appointmentDate.getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil <= 24) {
        return NextResponse.json({ error: 'No puedes cancelar con menos de 24 horas de anticipación' }, { status: 400 });
      }
    } else if (user.role === 'doctor') {
      if (appointment.doctorId !== user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Rol no válido' }, { status: 403 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });

    if (user.role === 'patient') {
      await createNotification({
        userId: appointment.doctorId,
        userRole: 'doctor',
        type: 'cancellation',
        title: 'Cita cancelada',
        message: `Un paciente ha cancelado su cita. Razón: ${reason}`,
      });
    } else {
      await createNotification({
        userId: appointment.patientId,
        userRole: 'patient',
        type: 'cancellation',
        title: 'Cita cancelada',
        message: `Tu doctora ha cancelado tu cita. Razón: ${reason}`,
      });
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error al cancelar cita' }, { status: 500 });
  }
}
