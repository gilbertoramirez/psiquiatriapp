import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { createCalendarEvent } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  try {
    const event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;
      const patientId = session.metadata?.patientId;

      if (appointmentId && patientId) {
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
                patientId,
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
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
