import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

const dayNames: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const appointments = await prisma.appointment.findMany({
    where: user.role === 'doctor' ? { doctorId: user.id } : { patientId: user.id },
    include: { patient: { select: { name: true } }, doctor: { select: { name: true } } },
  });

  const result = appointments.map(a => ({
    id: a.id,
    patientId: a.patientId,
    doctorId: a.doctorId,
    date: a.date,
    startTime: a.startTime,
    endTime: a.endTime,
    status: a.status,
    type: a.type,
    notes: a.notes,
    paymentStatus: a.paymentStatus,
    amount: a.amount,
    patientName: a.patient.name,
    doctorName: a.doctor.name,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'patient') return NextResponse.json({ error: 'Solo pacientes pueden agendar citas' }, { status: 403 });

  try {
    const { doctorId, date, startTime, type } = await request.json();

    if (!doctorId || !date || !startTime) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });

    const appointmentDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return NextResponse.json({ error: 'No puede agendar citas en fechas pasadas' }, { status: 400 });
    }

    const dayOfWeek = appointmentDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const availableHours = doctor.availableHours as Record<string, { start: string; end: string }[]>;
    const availableSlots = availableHours[dayName];

    if (!availableSlots || availableSlots.length === 0) {
      return NextResponse.json({ error: 'El doctor no atiende este día' }, { status: 400 });
    }

    const timeInMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = timeInMinutes(startTime);
    const isValidTime = availableSlots.some(
      (slot: { start: string; end: string }) => startMinutes >= timeInMinutes(slot.start) && startMinutes < timeInMinutes(slot.end)
    );

    if (!isValidTime) {
      return NextResponse.json({ error: 'Horario no disponible' }, { status: 400 });
    }

    const endTime = `${String(Math.floor((startMinutes + 60) / 60)).padStart(2, '0')}:${String((startMinutes + 60) % 60).padStart(2, '0')}`;

    const conflict = await prisma.appointment.findFirst({
      where: { doctorId, date, startTime, status: { not: 'cancelled' } },
    });

    if (conflict) {
      return NextResponse.json({ error: 'Este horario ya está ocupado' }, { status: 409 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: user.id,
        doctorId,
        date,
        startTime,
        endTime,
        type: type || 'followup',
        amount: doctor.consultationFee,
      },
      include: { doctor: { select: { name: true } } },
    });

    return NextResponse.json({
      ...appointment,
      doctorName: appointment.doctor.name,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear cita' }, { status: 500 });
  }
}
