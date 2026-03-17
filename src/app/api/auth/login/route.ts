import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, getPasswordStore } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 });
    }

    // Search in both patients and doctors
    const patient = db.patients.find(p => p.email === email);
    const doctor = db.doctors.find(d => d.email === email);
    const user = patient || doctor;

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const storedHash = getPasswordStore().get(user.id);
    if (!storedHash) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, storedHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = generateToken(user);
    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch {
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 });
  }
}
