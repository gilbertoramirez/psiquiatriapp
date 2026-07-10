import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReminder } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const appointments = await prisma.appointment.findMany({
    where: {
      date: tomorrowStr,
      status: 'scheduled',
      reminderSent: false,
    },
    include: {
      patient: true,
      doctor: true,
    },
  });

  let sentCount = 0;

  for (const appointment of appointments) {
    if (!appointment.patient.phone) continue;

    const modalidad = appointment.modality === 'in-person' ? 'presencial' : 'en línea';
    const message =
      `Hola ${appointment.patient.name}! Te recordamos tu cita con ${appointment.doctor.name} ` +
      `mañana ${appointment.date} a las ${appointment.startTime}. ` +
      `Modalidad: ${modalidad}. ` +
      `Si necesitas reagendar, contacta a tu doctora.`;

    const result = await sendReminder(appointment.patient.phone, message);

    if (result.sent) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { reminderSent: true },
      });
      sentCount++;
    }
  }

  return NextResponse.json({ sent: sentCount, total: appointments.length });
}
