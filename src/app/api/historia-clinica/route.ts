import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { HistoriaClinica, AuditEntry } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

function generarFirma(hc: Partial<HistoriaClinica>): string {
  const contenido = JSON.stringify({
    id: hc.id, patientId: hc.patientId, doctorId: hc.doctorId,
    fechaCreacion: hc.fechaCreacion, fichaIdentificacion: hc.fichaIdentificacion,
    diagnosticos: hc.diagnosticos, padecimientoActual: hc.padecimientoActual,
  });
  return crypto.createHash('sha256').update(contenido).digest('hex');
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get('patientId');
  if (!patientId) return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });

  const hc = db.historiasClinicas.find(h => h.patientId === patientId);
  if (!hc) return NextResponse.json(null);

  if (user.role === 'doctor' && hc.doctorId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (user.role === 'patient' && hc.patientId !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

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

    const existing = db.historiasClinicas.find(h => h.patientId === body.patientId);
    if (existing) return NextResponse.json({ error: 'El paciente ya tiene historia clínica. Use PATCH para actualizarla.' }, { status: 409 });

    const doctor = db.doctors.find(d => d.id === user.id);
    const now = new Date().toISOString();
    const id = `hc-${uuidv4()}`;

    const auditEntry: AuditEntry = {
      accion: 'creacion', usuario: user.id, usuarioNombre: user.name,
      fecha: now, detalle: 'Creación de historia clínica',
    };

    const hcBase: Partial<HistoriaClinica> = {
      id, patientId: body.patientId, doctorId: user.id,
      doctorNombre: doctor?.name || user.name,
      doctorCedula: doctor?.licenseNumber || '',
      fechaCreacion: now, fechaActualizacion: now,
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
      diagnosticos: body.diagnosticos || [],
      pronostico: body.pronostico || '',
      planTerapeutico: body.planTerapeutico || '',
      indicacionesIniciales: body.indicacionesIniciales || [],
    };

    const hc: HistoriaClinica = {
      ...hcBase as HistoriaClinica,
      firmaDigital: generarFirma(hcBase),
      auditTrail: [auditEntry],
      bloqueado: true,
    };

    db.historiasClinicas.push(hc);
    return NextResponse.json(hc, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al crear historia clínica' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const { patientId, seccion, datos } = await request.json();
    if (!patientId || !seccion || datos === undefined) {
      return NextResponse.json({ error: 'patientId, seccion y datos son requeridos' }, { status: 400 });
    }

    const hc = db.historiasClinicas.find(h => h.patientId === patientId && h.doctorId === user.id);
    if (!hc) return NextResponse.json({ error: 'Historia clínica no encontrada' }, { status: 404 });

    const allowed = [
      'fichaIdentificacion', 'antecedentesHeredoFamiliares', 'antecedentesPersonalesPatologicos',
      'antecedentesPersonalesNoPatologicos', 'antecedentesPsiquiatricos', 'padecimientoActual',
      'interrogatorio', 'exploracionFisica', 'signosVitales', 'examenMental',
      'resultadosEstudiosPrevios', 'diagnosticos', 'pronostico', 'planTerapeutico', 'indicacionesIniciales',
    ];
    if (!allowed.includes(seccion)) return NextResponse.json({ error: 'Sección no válida' }, { status: 400 });

    const now = new Date().toISOString();

    const record = hc as unknown as Record<string, unknown>;
    if (typeof datos === 'string' || Array.isArray(datos)) {
      record[seccion] = datos;
    } else {
      record[seccion] = { ...record[seccion] as object, ...datos };
    }

    hc.fechaActualizacion = now;
    hc.auditTrail.push({
      accion: 'addendum', usuario: user.id, usuarioNombre: user.name,
      fecha: now, detalle: `Actualización: ${seccion}`,
    });
    hc.firmaDigital = generarFirma(hc);

    return NextResponse.json(hc);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar historia clínica' }, { status: 500 });
  }
}
