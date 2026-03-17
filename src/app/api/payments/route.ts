import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { Payment } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const payments = db.payments.filter(p => p.patientId === user.id);
  return NextResponse.json(payments);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { appointmentId, method, cardNumber, cardName } = await request.json();

    if (!appointmentId || !method) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const appointment = db.appointments.find(a => a.id === appointmentId);
    if (!appointment) return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });

    if (appointment.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Esta cita ya fue pagada' }, { status: 409 });
    }

    // Simulate payment processing
    const last4 = cardNumber ? cardNumber.slice(-4) : '0000';

    const payment: Payment = {
      id: `pay-${uuidv4()}`,
      appointmentId,
      patientId: user.id,
      amount: appointment.amount,
      method,
      status: 'completed',
      date: new Date().toISOString(),
      reference: `REF-${Date.now()}-${last4}`,
    };

    db.payments.push(payment);
    appointment.paymentStatus = 'paid';
    appointment.status = 'confirmed';

    return NextResponse.json(payment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al procesar pago' }, { status: 500 });
  }
}
