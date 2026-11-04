import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { PatientLog, AuditEntry, Prescription, IndicacionMedica } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

function generarFirmaDigital(log: Omit<PatientLog, 'firmaDigital' | 'auditTrail' | 'addendums' | 'bloqueado'>): string {
  const contenido = JSON.stringify({
    id: log.id,
    patientId: log.patientId,
    doctorId: log.doctorId,
    date: log.date,
    evolucionClinica: log.evolucionClinica,
    diagnosticos: log.diagnosticos,
    indicaciones: log.indicaciones,
    treatment: log.treatment,
  });
  return crypto.createHash('sha256').update(contenido).digest('hex');
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const patientId = searchParams.get('patientId');

  if (user.role === 'patient') {
    if (type === 'logs') {
      const logs = await db.patientLogs.findByPatientId(user.id);
      return NextResponse.json(logs);
    }
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (user.role === 'doctor') {
    if (type === 'logs' && patientId) {
      const logs = await db.patientLogs.findByPatientAndDoctor(patientId, user.id);
      return NextResponse.json(logs);
    }

    if (type === 'list') {
      const patients = await db.patients.findAllForDoctor(user.id);
      return NextResponse.json(patients);
    }

    // Dashboard stats
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const myAppointments = await db.appointments.findByDoctorId(user.id);
    const todayAppts = myAppointments.filter(a => a.date === today);
    const weekAppts = myAppointments.filter(a => a.date >= today && a.date <= weekEndStr);
    const patientIds = [...new Set(myAppointments.map(a => a.patientId))];

    return NextResponse.json({
      totalPatients: patientIds.length,
      todayAppointments: todayAppts.length,
      weekAppointments: weekAppts.length,
      pendingPayments: myAppointments.filter(a => a.paymentStatus === 'pending').length,
      completedToday: todayAppts.filter(a => a.status === 'completed').length,
    });
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();

    if (!body.patientId) {
      return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });
    }
    if (!body.evolucionClinica || body.evolucionClinica.trim() === '') {
      return NextResponse.json({ error: 'La evolución del cuadro clínico es obligatoria (NOM-004 6.2.1)' }, { status: 400 });
    }
    if (!body.diagnosticos || body.diagnosticos.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un diagnóstico con código CIE-10 (NOM-004)' }, { status: 400 });
    }

    const doctor = await db.doctors.findById(user.id);
    const now = new Date().toISOString();

    const auditEntry: AuditEntry = {
      accion: 'creacion',
      usuario: user.id,
      usuarioNombre: user.name,
      fecha: now,
      detalle: 'Creación de nota de evolución',
    };

    const logBase = {
      id: `log-${uuidv4()}`,
      patientId: body.patientId,
      doctorId: user.id,
      doctorNombre: doctor?.name || user.name,
      doctorCedula: doctor?.licenseNumber || '',
      date: now,
      appointmentId: body.appointmentId,
      motivoConsulta: body.motivoConsulta || '',
      evolucionClinica: body.evolucionClinica,
      exploracionFisica: body.exploracionFisica || '',
      mood: body.mood || 5,
      symptoms: body.symptoms || [],
      examenMental: body.examenMental || '',
      riesgoSuicida: body.riesgoSuicida || 'nulo',
      riesgoViolencia: body.riesgoViolencia || 'nulo',
      consumoSustancias: body.consumoSustancias || '',
      signosVitales: body.signosVitales || {},
      resultadosEstudios: body.resultadosEstudios || '',
      diagnosticos: body.diagnosticos || [],
      pronostico: body.pronostico || 'reservado',
      progress: body.progress || 'stable',
      indicaciones: body.indicaciones || [],
      treatment: body.treatment || '',
      proximaCita: body.proximaCita || '',
    };

    const firmaDigital = generarFirmaDigital(logBase);

    const log: PatientLog = {
      ...logBase,
      firmaDigital,
      auditTrail: [auditEntry],
      addendums: [],
      bloqueado: true,
    };

    await db.patientLogs.create(log);

    if (log.indicaciones && log.indicaciones.length > 0) {
      const diagText = log.diagnosticos.map((d: { codigo: string; descripcion: string }) => `${d.codigo} - ${d.descripcion}`).join('; ');
      const prescription: Prescription = {
        id: `rx-${uuidv4()}`,
        patientId: log.patientId,
        doctorId: log.doctorId,
        date: now,
        medications: log.indicaciones.map((ind: IndicacionMedica) => ({
          name: ind.medicamento,
          dosage: ind.dosis,
          frequency: `${ind.frecuencia} (vía ${ind.via})`,
          duration: ind.duracion,
          instructions: ind.instrucciones || '',
        })),
        diagnosis: diagText || 'Ver nota de evolución',
        notes: `Generada automáticamente desde nota de evolución ${log.id}`,
      };
      await db.prescriptions.create(prescription);
    }

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const { logId, contenido } = await request.json();

    if (!logId || !contenido) {
      return NextResponse.json({ error: 'ID de registro y contenido requeridos' }, { status: 400 });
    }

    const existing = await db.patientLogs.findById(logId);
    if (!existing || existing.doctorId !== user.id) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const addendum = { fecha: now, contenido, usuario: user.name };
    const auditEntry: AuditEntry = {
      accion: 'addendum',
      usuario: user.id,
      usuarioNombre: user.name,
      fecha: now,
      detalle: `Addendum agregado: ${contenido.substring(0, 50)}...`,
    };

    const updated = await db.patientLogs.addAddendum(logId, addendum, auditEntry);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error al agregar addendum' }, { status: 500 });
  }
}
