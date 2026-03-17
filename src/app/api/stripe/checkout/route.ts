import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { appointmentId } = await request.json();

    if (!appointmentId) {
      return NextResponse.json({ error: 'ID de cita requerido' }, { status: 400 });
    }

    const appointment = db.appointments.find(a => a.id === appointmentId);
    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    if (appointment.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Esta cita ya fue pagada' }, { status: 409 });
    }

    const doctor = db.doctors.find(d => d.id === appointment.doctorId);
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mxn',
            product_data: {
              name: `Consulta Psiquiátrica - ${doctor?.name || 'Doctor'}`,
              description: `Cita: ${appointment.date} a las ${appointment.startTime} hrs`,
            },
            unit_amount: appointment.amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/paciente/pagos?success=true&session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`,
      cancel_url: `${origin}/paciente/pagos?cancelled=true`,
      customer_email: user.email,
      metadata: {
        appointmentId,
        patientId: user.id,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json(
      { error: 'Error al crear sesión de pago' },
      { status: 500 }
    );
  }
}
