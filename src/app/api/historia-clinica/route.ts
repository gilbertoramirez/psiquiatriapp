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

type HcRecord = Record<string, unknown> & { id: string; patientId: string; doctorId: string; fechaCreacion: Date | string };

function firma(hc: HcRecord): string {
  return integrityHash({
    id: hc.id, patientId: hc.patientId, doctorId: hc.doctorId,
    fechaCreacion: new Date(hc.fechaCreacion).toISOString(),
    fichaIdentificacion: hc.fichaIdentificacion, diagnosticos: hc.diagnosticos,
    padecimientoActual: hc.padecimientoActual,
  });
}

const JSON_SECTIONS = [
  'fichaIdentificacion', 'antecedentesHeredoFamiliares', 'antecedentesPersonalesPatologicos',
  'antecedentesPersonalesNoPatologicos', 'antecedentesPsiquiatricos', 'interrogatorio',
  'signosVitales', 'diagnosticos', 'indicacionesIniciales',
] as const;
const TEXT_SECTIONS = [
  'padecimientoActual', 'exploracionFisica', 'examenMental', 'resultadosEstudiosPrevios',
  'pronostico', 'planTerapeutico',
] as const;
const ARRAY_SECTIONS = new Set(['diagnosticos', 'indicacionesIniciales']);

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const patientId = new URL(request.url).searchParams.get('patientId');
  if (!patientId) return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });

  if (user.role === 'patient' && patientId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (user.role === 'doctor' && !(await doctorHasPatient(user.id, patientId))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const hc = await prisma.historiaClinica.findUnique({ where: { patientId } });
  return NextResponse.json(hc);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();

    if (!body.patientId) return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });
    if (!body.fichaIdentificacion?.nombre) return NextResponse.json({ error: 'Ficha de identificación requerida (NOM-004 6.1.1)' }, { status: 400 });
    if (!body.padecimientoActual) return NextResponse.json({ error: 'Padecimiento actual requerido (NOM-004 6.1.5)' }, { status: 400 });
    if (!(await doctorHasPatient(user.id, body.patientId))) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const existing = await prisma.historiaClinica.findUnique({ where: { patientId: body.patientId } });
    if (existing) return NextResponse.json({ error: 'El paciente ya tiene historia clínica. Use PATCH para actualizarla.' }, { status: 409 });

    const doctor = await getDoctorIdentity(user.id, user.name);
    const now = new Date();
    const audit: AuditEntry[] = [{
      accion: 'creacion', usuario: user.id, usuarioNombre: user.name,
      fecha: now.toISOString(), detalle: 'Creación de historia clínica',
    }];

    const diagnosticos: DiagnosticoCIE10[] = body.diagnosticos || [];
    const indicaciones: IndicacionMedica[] = body.indicacionesIniciales || [];

    const created = await prisma.historiaClinica.create({
      data: {
        patientId: body.patientId,
        doctorId: user.id,
        doctorNombre: doctor.nombre,
        doctorCedula: doctor.cedula,
        fichaIdentificacion: body.fichaIdentificacion,
        antecedentesHeredoFamiliares: body.antecedentesHeredoFamiliares || {},
        antecedentesPersonalesPatologicos: body.antecedentesPersonalesPatologicos || {},
        antecedentesPersonalesNoPatologicos: body.antecedentesPersonalesNoPatologicos || {},
        antecedentesPsiquiatricos: body.antecedentesPsiquiatricos || {},
        padecimientoActual: body.padecimientoActual,
        interrogatorio: body.interrogatorio || {},
        exploracionFisica: body.exploracionFisica || '',
        signosVitales: body.signosVitales || {},
        examenMental: body.examenMental || '',
        resultadosEstudiosPrevios: body.resultadosEstudiosPrevios || '',
        diagnosticos: diagnosticos as unknown as object,
        pronostico: body.pronostico || '',
        planTerapeutico: body.planTerapeutico || '',
        indicacionesIniciales: indicaciones as unknown as object,
        firmaDigital: '',
        auditTrail: audit as unknown as object,
        bloqueado: true,
        fechaCreacion: now,
      },
    });

    // The hash includes the generated id, so it is written in a second step.
    const hc = await prisma.historiaClinica.update({
      where: { id: created.id },
      data: { firmaDigital: firma(created as unknown as HcRecord) },
    });

    await createPrescriptionFromIndicaciones({
      patientId: hc.patientId, doctorId: user.id, indicaciones, diagnosticos,
      source: `historia clínica ${hc.id}`,
    });

    return NextResponse.json(hc, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear historia clínica' }, { status: 500 });
  }
}

// Updates one or more sections. Body: { patientId, secciones: { [seccion]: datos } }
// or the single-section form { patientId, seccion, datos }.
export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();
    const { patientId } = body;
    const secciones: Record<string, unknown> = body.secciones
      ?? (body.seccion ? { [body.seccion]: body.datos } : {});

    if (!patientId || Object.keys(secciones).length === 0) {
      return NextResponse.json({ error: 'patientId y secciones son requeridos' }, { status: 400 });
    }

    const hc = await prisma.historiaClinica.findUnique({ where: { patientId } });
    if (!hc || hc.doctorId !== user.id) return NextResponse.json({ error: 'Historia clínica no encontrada' }, { status: 404 });

    const allowed = new Set<string>([...JSON_SECTIONS, ...TEXT_SECTIONS]);
    const current = hc as unknown as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const changed: string[] = [];

    for (const [seccion, datos] of Object.entries(secciones)) {
      if (!allowed.has(seccion)) return NextResponse.json({ error: `Sección no válida: ${seccion}` }, { status: 400 });
      if (datos === undefined) continue;

      let value: unknown;
      if ((TEXT_SECTIONS as readonly string[]).includes(seccion)) {
        value = typeof datos === 'string' ? datos : String(datos ?? '');
      } else if (ARRAY_SECTIONS.has(seccion)) {
        if (!Array.isArray(datos)) return NextResponse.json({ error: `${seccion} debe ser una lista` }, { status: 400 });
        value = datos;
      } else {
        if (typeof datos !== 'object' || datos === null || Array.isArray(datos)) {
          return NextResponse.json({ error: `${seccion} debe ser un objeto` }, { status: 400 });
        }
        value = { ...(current[seccion] as object), ...(datos as object) };
      }

      if (JSON.stringify(value) !== JSON.stringify(current[seccion])) {
        data[seccion] = value;
        changed.push(seccion);
      }
    }

    if (changed.length === 0) return NextResponse.json(hc);

    const now = new Date().toISOString();
    const auditTrail = [
      ...((hc.auditTrail as unknown as AuditEntry[]) || []),
      { accion: 'addendum', usuario: user.id, usuarioNombre: user.name, fecha: now, detalle: `Actualización: ${changed.join(', ')}` },
    ];
    const merged = { ...current, ...data } as HcRecord;

    const updated = await prisma.historiaClinica.update({
      where: { id: hc.id },
      data: { ...data, auditTrail: auditTrail as unknown as object, firmaDigital: firma(merged) },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar historia clínica' }, { status: 500 });
  }
}
