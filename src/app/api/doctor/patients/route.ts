import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Patients registered by the doctor who have no digital account (cannot log in).

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

const patientSelect = {
  id: true, email: true, name: true, phone: true, dateOfBirth: true,
  emergencyContact: true, emergencyPhone: true, curp: true, notas: true,
  accountStatus: true, managedByDoctorId: true, createdAt: true,
} as const;

const clean = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  const patients = await prisma.patient.findMany({
    where: { managedByDoctorId: user.id },
    select: patientSelect,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(patients);
}

export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();
    const nombre = clean(body.nombre);
    if (!nombre) return NextResponse.json({ error: 'El nombre del paciente es requerido' }, { status: 400 });

    const patient = await prisma.patient.create({
      data: {
        // Email is required and unique; managed patients get an internal placeholder.
        email: `sin-cuenta-${uuidv4()}@interno.psiquiatriapp`,
        name: nombre,
        phone: clean(body.telefono),
        dateOfBirth: clean(body.fechaNacimiento),
        emergencyContact: clean(body.contactoEmergencia),
        emergencyPhone: clean(body.telefonoEmergencia),
        curp: clean(body.curp)?.toUpperCase() ?? null,
        notas: clean(body.notas),
        accountStatus: 'managed',
        managedByDoctorId: user.id,
      },
      select: patientSelect,
    });
    return NextResponse.json(patient, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al registrar paciente' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.patientId) return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });

    const existing = await prisma.patient.findFirst({
      where: { id: body.patientId, managedByDoctorId: user.id },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });

    const data: Record<string, string | null> = {};
    if (clean(body.nombre)) data.name = clean(body.nombre);
    const optional: [string, string][] = [
      ['telefono', 'phone'], ['fechaNacimiento', 'dateOfBirth'], ['contactoEmergencia', 'emergencyContact'],
      ['telefonoEmergencia', 'emergencyPhone'], ['curp', 'curp'], ['notas', 'notas'],
    ];
    for (const [from, to] of optional) {
      if (from in body) data[to] = clean(body[from]);
    }
    if (data.curp) data.curp = data.curp.toUpperCase();

    const patient = await prisma.patient.update({ where: { id: existing.id }, data, select: patientSelect });
    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
  }
}
