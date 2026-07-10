import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/auth';
import { confirmPaymentAndCreateEvent } from '@/lib/confirm-payment';

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
      await confirmPaymentAndCreateEvent({
        appointmentId,
        patientId: user.id,
        method: 'card',
        reference: `STRIPE-${session.id}`,
      });

      return NextResponse.json({ success: true, status: 'paid' });
    }

    return NextResponse.json({ success: false, status: session.payment_status });
  } catch (err) {
    console.error('Verify error:', err);
    return NextResponse.json({ error: 'Error al verificar pago' }, { status: 500 });
  }
}
