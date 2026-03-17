import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { Appointment } from '@/types';

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

  let appointments: Appointment[];
  if (user.role === 'doctor') {
    appointments = db.appointments.filter(a => a.doctorId === user.id);
  } else {
    appointments = db.appointments.filter(a => a.patientId === user.id);
  }

  // Enrich with names
  appointments = appointments.map(a => ({
    ...a,
    patientName: db.patients.find(p => p.id === a.patientId)?.name || 'Paciente',
    doctorName: db.doctors.find(d => d.id === a.doctorId)?.name || 'Doctor',
  }));

  return NextResponse.json(appointments);
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

    const doctor = db.doctors.find(d => d.id === doctorId);
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });

    // Validate the selected date is not in the past
    const appointmentDate = new Date(date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      return NextResponse.json({ error: 'No puede agendar citas en fechas pasadas' }, { status: 400 });
    }

    // Validate the time is within available hours
    const dayOfWeek = appointmentDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const availableSlots = doctor.availableHours[dayName];

    if (!availableSlots || availableSlots.length === 0) {
      return NextResponse.json({ error: 'El doctor no atiende este día' }, { status: 400 });
    }

    const timeInMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const startMinutes = timeInMinutes(startTime);
    const isValidTime = availableSlots.some(
      slot => startMinutes >= timeInMinutes(slot.start) && startMinutes < timeInMinutes(slot.end)
    );

    if (!isValidTime) {
      return NextResponse.json({ error: 'Horario no disponible' }, { status: 400 });
    }

    // Check for conflicts
    const endTime = `${String(Math.floor((startMinutes + 60) / 60)).padStart(2, '0')}:${String((startMinutes + 60) % 60).padStart(2, '0')}`;
    const conflict = db.appointments.find(
      a => a.doctorId === doctorId && a.date === date && a.startTime === startTime && a.status !== 'cancelled'
    );

    if (conflict) {
      return NextResponse.json({ error: 'Este horario ya está ocupado' }, { status: 409 });
    }

    const appointment: Appointment = {
      id: `apt-${uuidv4()}`,
      patientId: user.id,
      doctorId,
      date,
      startTime,
      endTime,
      status: 'scheduled',
      type: type || 'followup',
      paymentStatus: 'pending',
      amount: doctor.consultationFee,
    };

    db.appointments.push(appointment);

    return NextResponse.json({
      ...appointment,
      doctorName: doctor.name,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear cita' }, { status: 500 });
  }
}
