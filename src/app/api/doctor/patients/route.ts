import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '@/lib/auth';
import db from '@/lib/db';
import { Patient } from '@/types';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

// GET - list patients registered by this doctor
export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  const managed = db.patients.filter(p => p.creadoPorDoctor && p.doctorId === user.id);
  return NextResponse.json(managed);
}

// POST - register a patient without an account
export async function POST(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();

    if (!body.nombre || body.nombre.trim() === '') {
      return NextResponse.json({ error: 'El nombre del paciente es requerido' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const id = `patient-managed-${uuidv4()}`;

    const patient: Patient = {
      id,
      email: `sin-cuenta-${id}@interno`,
      name: body.nombre.trim(),
      role: 'patient',
      phone: body.telefono || undefined,
      createdAt: now,
      dateOfBirth: body.fechaNacimiento || undefined,
      emergencyContact: body.contactoEmergencia || undefined,
      emergencyPhone: body.telefonoEmergencia || undefined,
      curp: body.curp || undefined,
      notas: body.notas || undefined,
      creadoPorDoctor: true,
      sinCuentaDigital: true,
      doctorId: user.id,
    };

    db.patients.push(patient);
    return NextResponse.json(patient, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al registrar paciente' }, { status: 500 });
  }
}

// PATCH - update patient info
export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  try {
    const body = await request.json();
    if (!body.patientId) return NextResponse.json({ error: 'ID de paciente requerido' }, { status: 400 });

    const patient = db.patients.find(p => p.id === body.patientId && p.doctorId === user.id && p.creadoPorDoctor);
    if (!patient) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });

    if (body.nombre) patient.name = body.nombre.trim();
    if (body.telefono !== undefined) patient.phone = body.telefono || undefined;
    if (body.fechaNacimiento !== undefined) patient.dateOfBirth = body.fechaNacimiento || undefined;
    if (body.contactoEmergencia !== undefined) patient.emergencyContact = body.contactoEmergencia || undefined;
    if (body.telefonoEmergencia !== undefined) patient.emergencyPhone = body.telefonoEmergencia || undefined;
    if (body.curp !== undefined) patient.curp = body.curp || undefined;
    if (body.notas !== undefined) patient.notas = body.notas || undefined;

    return NextResponse.json(patient);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
  }
}
