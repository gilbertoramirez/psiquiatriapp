import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { confirmPaymentAndCreateEvent } from '@/lib/confirm-payment';

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
        await confirmPaymentAndCreateEvent({
          appointmentId,
          patientId,
          method: 'card',
          reference: `STRIPE-${session.id}`,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}
