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

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'slots') {
    const date = searchParams.get('date');
    const doctorId = searchParams.get('doctorId') || (user.role === 'doctor' ? user.id : 'doc-1');
    if (!date) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 });

    const doctor = await db.doctors.findById(doctorId);
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });

    const appointmentDate = new Date(date + 'T12:00:00');
    const dayOfWeek = appointmentDate.getDay();
    const dayName = dayNames[dayOfWeek];
    const availableSlots = doctor.availableHours[dayName];

    if (!availableSlots || availableSlots.length === 0) return NextResponse.json([]);

    const booked = await db.appointments.findByDoctorAndDate(doctorId, date);
    const bookedTimes = booked.map(a => a.startTime);

    const slots: { time: string; available: boolean }[] = [];
    availableSlots.forEach(slot => {
      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);
      let current = startH * 60 + startM;
      const end = endH * 60 + endM;
      while (current < end) {
        const time = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
        slots.push({ time, available: !bookedTimes.includes(time) });
        current += 60;
      }
    });

    return NextResponse.json(slots);
  }

  let appointments: Appointment[];
  if (user.role === 'doctor') {
    appointments = await db.appointments.findByDoctorId(user.id);
  } else {
    appointments = await db.appointments.findByPatientId(user.id);
  }

  const doctors = await db.doctors.findAll();
  const doctorMap = new Map(doctors.map(d => [d.id, d.name]));

  const enriched = await Promise.all(appointments.map(async a => {
    const patient = await db.patients.findById(a.patientId);
    return {
      ...a,
      patientName: patient?.name || 'Paciente',
      doctorName: doctorMap.get(a.doctorId) || 'Doctor',
    };
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { doctorId: rawDoctorId, patientId, patientNameFree, date, startTime, type, notes } = await request.json();

    if (!date || !startTime) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const resolvedDoctorId = (rawDoctorId === 'self' || !rawDoctorId) && user.role === 'doctor' ? user.id : rawDoctorId;

    const doctor = await db.doctors.findById(resolvedDoctorId);
    if (!doctor) return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });

    const appointmentDate = new Date(date + 'T12:00:00');

    if (user.role !== 'doctor') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (appointmentDate < today) {
        return NextResponse.json({ error: 'No puede agendar citas en fechas pasadas' }, { status: 400 });
      }
    }

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

    const conflict = await db.appointments.findConflict(resolvedDoctorId, date, startTime);
    if (conflict) {
      return NextResponse.json({ error: 'Este horario ya está ocupado' }, { status: 409 });
    }

    const endTime = `${String(Math.floor((startMinutes + 60) / 60)).padStart(2, '0')}:${String((startMinutes + 60) % 60).padStart(2, '0')}`;

    let finalPatientId = user.role === 'doctor' ? patientId : user.id;
    let patientNameResolved: string | undefined;

    if (user.role === 'doctor' && (!patientId || patientId === '') && patientNameFree) {
      const tempId = `patient-temp-${uuidv4()}`;
      const now2 = new Date().toISOString();
      await db.patients.create({
        id: tempId,
        email: `sin-cuenta-${tempId}@interno`,
        name: patientNameFree.trim(),
        role: 'patient',
        createdAt: now2,
        creadoPorDoctor: true,
        sinCuentaDigital: true,
        doctorId: user.id,
      });
      finalPatientId = tempId;
      patientNameResolved = patientNameFree.trim();
    }

    const appointment: Appointment = {
      id: `apt-${uuidv4()}`,
      patientId: finalPatientId,
      doctorId: resolvedDoctorId,
      date,
      startTime,
      endTime,
      status: 'scheduled',
      type: type || 'followup',
      paymentStatus: 'pending',
      amount: doctor.consultationFee,
      notes: notes || undefined,
    };

    await db.appointments.create(appointment);

    const patient = await db.patients.findById(finalPatientId);
    const patientName = patientNameResolved || patient?.name || 'Paciente';

    return NextResponse.json({
      ...appointment,
      doctorName: doctor.name,
      patientName,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear cita' }, { status: 500 });
  }
}
