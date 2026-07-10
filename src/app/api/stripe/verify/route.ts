import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createCalendarEvent } from '@/lib/google-calendar';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { sessionId, appointmentId } = await request.json();

    if (!sessionId || !appointmentId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: { select: { name: true, address: true } },
          patient: { select: { name: true, email: true } },
        },
      });

      if (appointment && appointment.paymentStatus !== 'paid') {
        await prisma.$transaction([
          prisma.appointment.update({
            where: { id: appointmentId },
            data: { paymentStatus: 'paid', status: 'confirmed' },
          }),
          prisma.payment.create({
            data: {
              appointmentId,
              patientId: user.id,
              amount: appointment.amount,
              method: 'card',
              status: 'completed',
              date: new Date().toISOString(),
              reference: `STRIPE-${session.id}`,
            },
          }),
        ]);

        if (!appointment.meetLink) {
          const { meetLink, eventId } = await createCalendarEvent({
            patientName: appointment.patient.name,
            patientEmail: appointment.patient.email,
            doctorName: appointment.doctor.name,
            date: appointment.date,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            type: appointment.type,
            modality: appointment.modality,
            address: appointment.doctor.address || undefined,
          });

          if (meetLink || eventId) {
            await prisma.appointment.update({
              where: { id: appointmentId },
              data: { meetLink, calendarEventId: eventId },
            });
          }
        }
      }

      return NextResponse.json({ success: true, status: 'paid' });
    }

    return NextResponse.json({ success: false, status: session.payment_status });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'Error al verificar pago' }, { status: 500 });
  }
}
