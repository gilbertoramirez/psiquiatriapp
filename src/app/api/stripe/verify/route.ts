import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { Payment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

// Verify a completed Stripe session and mark appointment as paid
export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { sessionId, appointmentId } = await request.json();

    if (!sessionId || !appointmentId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Retrieve the session from Stripe to verify payment
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const appointment = db.appointments.find(a => a.id === appointmentId);
      if (appointment && appointment.paymentStatus !== 'paid') {
        appointment.paymentStatus = 'paid';
        appointment.status = 'confirmed';

        const payment: Payment = {
          id: `pay-${uuidv4()}`,
          appointmentId,
          patientId: user.id,
          amount: appointment.amount,
          method: 'card',
          status: 'completed',
          date: new Date().toISOString(),
          reference: `STRIPE-${session.id}`,
        };

        db.payments.push(payment);
      }
      return NextResponse.json({ success: true, status: 'paid' });
    }

    return NextResponse.json({ success: false, status: session.payment_status });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'Error al verificar pago' }, { status: 500 });
  }
}
