import { prisma } from '@/lib/prisma';
import { createCalendarEvent } from '@/lib/google-calendar';
import { createNotification } from '@/lib/create-notification';

interface ConfirmPaymentParams {
  appointmentId: string;
  patientId: string;
  method: 'card' | 'transfer' | 'cash';
  reference?: string;
}

export async function confirmPaymentAndCreateEvent(params: ConfirmPaymentParams) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: params.appointmentId },
    include: {
      doctor: { select: { name: true, address: true } },
      patient: { select: { name: true, email: true } },
    },
  });

  if (!appointment || appointment.paymentStatus === 'paid') return null;

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: params.appointmentId },
      data: { paymentStatus: 'paid', status: 'confirmed' },
    }),
    prisma.payment.create({
      data: {
        appointmentId: params.appointmentId,
        patientId: params.patientId,
        amount: appointment.amount,
        method: params.method,
        status: 'completed',
        date: new Date().toISOString(),
        reference: params.reference,
      },
    }),
  ]);

  await createNotification({
    userId: params.patientId,
    userRole: 'patient',
    type: 'payment',
    title: 'Pago confirmado',
    message: 'Tu pago ha sido confirmado y tu cita está lista.',
  });

  if (appointment.modality === 'online' && !appointment.meetLink) {
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
        where: { id: params.appointmentId },
        data: { meetLink, calendarEventId: eventId },
      });
    }

    return { meetLink };
  }

  return { meetLink: null };
}
