import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import db from '@/lib/db';
import { Payment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

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
        const appointment = db.appointments.find(a => a.id === appointmentId);
        if (appointment) {
          appointment.paymentStatus = 'paid';
          appointment.status = 'confirmed';

          const payment: Payment = {
            id: `pay-${uuidv4()}`,
            appointmentId,
            patientId,
            amount: appointment.amount,
            method: 'card',
            status: 'completed',
            date: new Date().toISOString(),
            reference: `STRIPE-${session.id}`,
          };

          db.payments.push(payment);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
