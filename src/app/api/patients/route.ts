import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  integrityHash, doctorHasPatient, getDoctorIdentity, createPrescriptionFromIndicaciones,
} from '@/lib/clinical-record';
import { AuditEntry, DiagnosticoCIE10, IndicacionMedica } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const patientId = searchParams.get('patientId');

  if (user.role === 'patient') {
    if (type === 'logs') {
      const logs = await prisma.patientLog.findMany({
        where: { patientId: user.id },
        orderBy: { date: 'desc' },
      });
      return NextResponse.json(logs);
    }
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (user.role === 'doctor') {
    if (type === 'logs' && patientId) {
      const logs = await prisma.patientLog.findMany({
        where: { patientId, doctorId: user.id },
      });
      return NextResponse.json(logs);
    }

    if (type === 'list') {
      const [appointments, doctorInvitations, managed] = await Promise.all([
        prisma.appointment.findMany({
          where: { doctorId: user.id },
          select: { patientId: true },
          distinct: ['patientId'],
        }),
        prisma.invitation.findMany({
          where: { doctorId: user.id },
          select: { patientId: true },
        }),
        prisma.patient.findMany({
          where: { managedByDoctorId: user.id },
          select: { id: true },
        }),
      ]);
      const patientIds = [...new Set([
        ...appointments.map(a => a.patientId),
        ...doctorInvitations.map(i => i.patientId),
        ...managed.map(p => p.id),
      ])];
      const patients = await prisma.patient.findMany({
        where: { id: { in: patientIds } },
        select: {
          id: true, email: true, name: true, phone: true,
          dateOfBirth: true, emergencyContact: true, emergencyPhone: true,
          medicalHistory: true, accountStatus: true, createdAt: true,
          curp: true, notas: true, managedByDoctorId: true,
        },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(patients);
    }

    const today = new Date().toISOString().split('T')[0];
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const [todayCount, weekCount, pendingCount, completedCount, patientCount] = await Promise.all([
      prisma.appointment.count({ where: { doctorId: user.id, date: today } }),
      prisma.appointment.count({ where: { doctorId: user.id, date: { gte: today, lte: weekEndStr } } }),
      prisma.appointment.count({ where: { doctorId: user.id, paymentStatus: 'pending' } }),
      prisma.appointment.count({ where: { doctorId: user.id, date: today, status: 'completed' } }),
      prisma.appointment.findMany({
        where: { doctorId: user.id },
        select: { patientId: true },
        distinct: ['patientId'],
      }),
    ]);

    return NextResponse.json({
      totalPatients: patientCount.length,
      todayAppointments: todayCount,
      weekAppointments: weekCount,
      pendingPayments: pendingCount,
      completedToday: completedCount,
    });
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}

function firmaNota(log: {
  id: string; patientId: string; doctorId: string; date: string;
  evolucionClinica: string | null; diagnosticos: unknown; indicaciones: unknown; treatment: string;
}): string {
  return integrityHash({
    id: log.id, patientId: log.patientId, doctorId: log.doctorId, date: log.date,
    evolucionClinica: log.evolucionClinica, diagnosticos: log.diagnosticos,
    indicaciones: log.indicaciones, treatment: log.treatment,
  });
}

const RIESGOS = ['nulo', 'bajo', 'moderado', 'alto'];

// POST - create a Nota de Evolución (NOM-004-SSA3-2012 §6.2), signed and locked (NOM-024)
export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();

    if (!body.patientId) return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });
    if (!body.evolucionClinica || String(body.evolucionClinica).trim() === '') {
      return NextResponse.json({ error: 'La evolución del cuadro clínico es obligatoria (NOM-004 6.2.1)' }, { status: 400 });
    }
    const diagnosticos: DiagnosticoCIE10[] = Array.isArray(body.diagnosticos) ? body.diagnosticos : [];
    if (diagnosticos.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un diagnóstico con código CIE-10 (NOM-004)' }, { status: 400 });
    }
    if (!(await doctorHasPatient(user.id, body.patientId))) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const indicaciones: IndicacionMedica[] = Array.isArray(body.indicaciones) ? body.indicaciones : [];
    const doctor = await getDoctorIdentity(user.id, user.name);
    const now = new Date().toISOString();
    const audit: AuditEntry[] = [{
      accion: 'creacion', usuario: user.id, usuarioNombre: user.name,
      fecha: now, detalle: 'Creación de nota de evolución',
    }];
    const soap = body.soapNotes && Object.values(body.soapNotes).some(v => v) ? body.soapNotes : undefined;

    const created = await prisma.patientLog.create({
      data: {
        patientId: body.patientId,
        doctorId: user.id,
        date: now,
        appointmentId: body.appointmentId || null,
        mood: Number(body.mood) || 5,
        symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
        // `notes` keeps older views (dashboard, PDF) working.
        notes: body.evolucionClinica,
        treatment: body.treatment || '',
        progress: body.progress || 'stable',
        soapNotes: soap,
        doctorNombre: doctor.nombre,
        doctorCedula: doctor.cedula,
        motivoConsulta: body.motivoConsulta || '',
        evolucionClinica: body.evolucionClinica,
        exploracionFisica: body.exploracionFisica || '',
        examenMental: body.examenMental || '',
        riesgoSuicida: RIESGOS.includes(body.riesgoSuicida) ? body.riesgoSuicida : 'nulo',
        riesgoViolencia: RIESGOS.includes(body.riesgoViolencia) ? body.riesgoViolencia : 'nulo',
        consumoSustancias: body.consumoSustancias || '',
        signosVitales: body.signosVitales || {},
        resultadosEstudios: body.resultadosEstudios || '',
        diagnosticos: diagnosticos as unknown as object,
        pronostico: body.pronostico || 'reservado',
        indicaciones: indicaciones as unknown as object,
        proximaCita: body.proximaCita || '',
        auditTrail: audit as unknown as object,
        addendums: [],
        bloqueado: true,
      },
    });

    const log = await prisma.patientLog.update({
      where: { id: created.id },
      data: { firmaDigital: firmaNota(created) },
    });

    await createPrescriptionFromIndicaciones({
      patientId: log.patientId, doctorId: user.id, appointmentId: log.appointmentId || undefined,
      indicaciones, diagnosticos, source: `nota de evolución ${log.id}`,
    });

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear registro' }, { status: 500 });
  }
}

// PATCH - add an addendum to a signed note (NOM-024: notes are never edited or deleted)
export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const { logId, contenido } = await request.json();
    if (!logId || !contenido || String(contenido).trim() === '') {
      return NextResponse.json({ error: 'ID de registro y contenido requeridos' }, { status: 400 });
    }

    const log = await prisma.patientLog.findFirst({ where: { id: logId, doctorId: user.id } });
    if (!log) return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 });

    const now = new Date().toISOString();
    const texto = String(contenido).trim();
    const addendums = [
      ...((log.addendums as unknown as { fecha: string; contenido: string; usuario: string }[]) || []),
      { fecha: now, contenido: texto, usuario: user.name },
    ];
    const auditTrail = [
      ...((log.auditTrail as unknown as AuditEntry[]) || []),
      {
        accion: 'addendum', usuario: user.id, usuarioNombre: user.name, fecha: now,
        detalle: `Addendum agregado: ${texto.length > 50 ? `${texto.substring(0, 50)}...` : texto}`,
      },
    ];

    const updated = await prisma.patientLog.update({
      where: { id: log.id },
      data: { addendums, auditTrail: auditTrail as unknown as object },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error al agregar addendum' }, { status: 500 });
  }
}
