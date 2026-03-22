import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { PatientLog, AuditEntry } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

// Generate integrity hash for NOM-024 compliance
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

// GET patient list (for doctors) or patient logs
export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const patientId = searchParams.get('patientId');

  if (user.role === 'doctor') {
    if (type === 'logs' && patientId) {
      const logs = db.patientLogs.filter(l => l.patientId === patientId && l.doctorId === user.id);
      return NextResponse.json(logs);
    }

    if (type === 'list') {
      const patientIds = [...new Set(db.appointments.filter(a => a.doctorId === user.id).map(a => a.patientId))];
      const patients = db.patients.filter(p => patientIds.includes(p.id));
      return NextResponse.json(patients);
    }

    // Dashboard stats
    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const myAppointments = db.appointments.filter(a => a.doctorId === user.id);
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

// POST - create patient log entry (Nota de Evolución NOM-004-SSA3-2012)
export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();

    // Validate required NOM-004 fields
    if (!body.patientId) {
      return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });
    }
    if (!body.evolucionClinica || body.evolucionClinica.trim() === '') {
      return NextResponse.json({ error: 'La evolución del cuadro clínico es obligatoria (NOM-004 6.2.1)' }, { status: 400 });
    }
    if (!body.diagnosticos || body.diagnosticos.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un diagnóstico con código CIE-10 (NOM-004)' }, { status: 400 });
    }

    const doctor = db.doctors.find(d => d.id === user.id);
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

      // Evolución del cuadro clínico
      motivoConsulta: body.motivoConsulta || '',
      evolucionClinica: body.evolucionClinica,
      exploracionFisica: body.exploracionFisica || '',

      // Evaluación psiquiátrica
      mood: body.mood || 5,
      symptoms: body.symptoms || [],
      examenMental: body.examenMental || '',
      riesgoSuicida: body.riesgoSuicida || 'nulo',
      riesgoViolencia: body.riesgoViolencia || 'nulo',
      consumoSustancias: body.consumoSustancias || '',

      // Signos vitales
      signosVitales: body.signosVitales || {},

      // Estudios auxiliares
      resultadosEstudios: body.resultadosEstudios || '',

      // Diagnósticos CIE-10
      diagnosticos: body.diagnosticos || [],

      // Pronóstico
      pronostico: body.pronostico || 'reservado',
      progress: body.progress || 'stable',

      // Tratamiento
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
      bloqueado: true, // NOM-024: inmutable una vez creado
    };

    db.patientLogs.push(log);
    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}

// PATCH - add addendum to existing log (NOM-024: no deletion, only additions)
export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const { logId, contenido } = await request.json();

    if (!logId || !contenido) {
      return NextResponse.json({ error: 'ID de registro y contenido requeridos' }, { status: 400 });
    }

    const log = db.patientLogs.find(l => l.id === logId && l.doctorId === user.id);
    if (!log) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // NOM-024: Add addendum instead of modifying
    log.addendums.push({
      fecha: now,
      contenido,
      usuario: user.name,
    });

    // Update audit trail
    log.auditTrail.push({
      accion: 'addendum',
      usuario: user.id,
      usuarioNombre: user.name,
      fecha: now,
      detalle: `Addendum agregado: ${contenido.substring(0, 50)}...`,
    });

    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: 'Error al agregar addendum' }, { status: 500 });
  }
}
