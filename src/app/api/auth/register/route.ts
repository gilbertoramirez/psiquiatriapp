import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, generateToken, getPasswordStore } from '@/lib/auth';
import db from '@/lib/db';
import { Patient } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, phone, dateOfBirth, emergencyContact, emergencyPhone } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, contraseña y nombre son requeridos' }, { status: 400 });
    }

    const existingPatient = db.patients.find(p => p.email === email);
    const existingDoctor = db.doctors.find(d => d.email === email);
    if (existingPatient || existingDoctor) {
      return NextResponse.json({ error: 'Este email ya está registrado' }, { status: 409 });
    }

    const id = `pat-${uuidv4()}`;
    const hashedPassword = await hashPassword(password);
    getPasswordStore().set(id, hashedPassword);

    const patient: Patient = {
      id,
      email,
      name,
      role: 'patient',
      phone,
      dateOfBirth,
      emergencyContact,
      emergencyPhone,
      createdAt: new Date().toISOString(),
    };

    db.patients.push(patient);
    const token = generateToken(patient);

    return NextResponse.json({ token, user: { id: patient.id, name: patient.name, email: patient.email, role: patient.role } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 });
  }
}
