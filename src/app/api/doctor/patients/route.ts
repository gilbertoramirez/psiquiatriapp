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

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (user.role !== 'doctor') return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });

  const managed = await db.patients.findManagedByDoctor(user.id);
  return NextResponse.json(managed);
}

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
    const realEmail = body.email?.trim();

    const patient: Patient = {
      id,
      email: realEmail || `sin-cuenta-${id}@interno`,
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

    await db.patients.create(patient);
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

    if (body.action === 'merge') {
      if (!body.realEmail) return NextResponse.json({ error: 'Email del paciente real requerido' }, { status: 400 });

      const tempPatient = await db.patients.findById(body.patientId);
      if (!tempPatient || !tempPatient.creadoPorDoctor || tempPatient.doctorId !== user.id) {
        return NextResponse.json({ error: 'Paciente temporal no encontrado' }, { status: 404 });
      }

      const realPatient = await db.patients.findByEmail(body.realEmail);
      if (!realPatient || realPatient.creadoPorDoctor) {
        return NextResponse.json({ error: 'No se encontró un paciente registrado con ese email' }, { status: 404 });
      }

      // Merge fields from temp into real if missing
      const updates: Partial<Patient> = {};
      if (!realPatient.phone && tempPatient.phone) updates.phone = tempPatient.phone;
      if (!realPatient.dateOfBirth && tempPatient.dateOfBirth) updates.dateOfBirth = tempPatient.dateOfBirth;
      if (!realPatient.emergencyContact && tempPatient.emergencyContact) updates.emergencyContact = tempPatient.emergencyContact;
      if (!realPatient.emergencyPhone && tempPatient.emergencyPhone) updates.emergencyPhone = tempPatient.emergencyPhone;
      if (!realPatient.curp && tempPatient.curp) updates.curp = tempPatient.curp;
      if (Object.keys(updates).length > 0) await db.patients.update(realPatient.id, updates);

      // Migrate all records and delete temp
      await db.patients.migrateId(tempPatient.id, realPatient.id);

      const updated = await db.patients.findById(realPatient.id);
      return NextResponse.json({ merged: true, patient: updated });
    }

    // Regular update
    const patient = await db.patients.findById(body.patientId);
    if (!patient || !patient.creadoPorDoctor || patient.doctorId !== user.id) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    const updates: Partial<Patient> = {};
    if (body.nombre) updates.name = body.nombre.trim();
    if (body.email !== undefined) {
      const e = body.email?.trim();
      updates.email = e || `sin-cuenta-${patient.id}@interno`;
    }
    if (body.telefono !== undefined) updates.phone = body.telefono || undefined;
    if (body.fechaNacimiento !== undefined) updates.dateOfBirth = body.fechaNacimiento || undefined;
    if (body.contactoEmergencia !== undefined) updates.emergencyContact = body.contactoEmergencia || undefined;
    if (body.telefonoEmergencia !== undefined) updates.emergencyPhone = body.telefonoEmergencia || undefined;
    if (body.curp !== undefined) updates.curp = body.curp || undefined;
    if (body.notas !== undefined) updates.notas = body.notas || undefined;

    await db.patients.update(body.patientId, updates);
    const updated = await db.patients.findById(body.patientId);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 });
  }
}
