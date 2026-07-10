import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { confirmPaymentAndCreateEvent } from '@/lib/confirm-payment';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { appointmentId, method } = await request.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'ID de cita requerido' }, { status: 400 });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    if (appointment.doctorId !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (appointment.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Esta cita ya fue pagada' }, { status: 409 });
    }

    const result = await confirmPaymentAndCreateEvent({
      appointmentId,
      patientId: appointment.patientId,
      method: method || 'transfer',
      reference: `MANUAL-${Date.now()}`,
    });

    return NextResponse.json({ success: true, meetLink: result?.meetLink || null });
  } catch (err) {
    console.error('Confirm payment error:', err);
    return NextResponse.json({ error: 'Error al confirmar pago' }, { status: 500 });
  }
}
