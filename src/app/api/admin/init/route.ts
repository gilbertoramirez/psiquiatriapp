// Database initialization endpoint.
// Call POST /api/admin/init?secret=<INIT_SECRET> once to create tables and seed doctors.
// INIT_SECRET must be set in environment variables.

import { NextRequest, NextResponse } from 'next/server';
import { getSql, SCHEMA_SQL } from '@/lib/pg';
import { hashSync } from 'bcryptjs';

const availableHours = {
  monday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
  tuesday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
  wednesday: [{ start: '09:00', end: '14:00' }],
  thursday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
  friday: [{ start: '09:00', end: '14:00' }],
};

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const initSecret = process.env.INIT_SECRET;

  if (!initSecret || secret !== initSecret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL no configurado' }, { status: 500 });
  }

  const sql = getSql()!;

  try {
    // Create all tables — split on semicolons and run each statement
    const statements = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await sql.query(stmt);
    }

    // Seed doctors
    const now = new Date().toISOString();
    const hash = hashSync('doctor123', 10);

    const doctors = [
      {
        id: 'doc-1',
        email: 'dr.garcia@psiquiatriapp.com',
        name: 'Dra. María García López',
        specialty: 'Psiquiatría General',
        licenseNumber: 'PSQ-2024-001',
        consultationFee: 1500,
        phone: '+52 55 1234 5678',
      },
      {
        id: 'doc-2',
        email: 'dra.claudiahdz@psiquiatriapp.com',
        name: 'Dra. Claudia Anahí Hernández Carrillo',
        specialty: 'Psiquiatría',
        licenseNumber: 'PSQ-2024-002',
        consultationFee: 1500,
        phone: null,
      },
    ];

    for (const d of doctors) {
      await sql`
        INSERT INTO users (id, email, name, role, phone, created_at, specialty, license_number, consultation_fee, available_hours)
        VALUES (${d.id}, ${d.email}, ${d.name}, 'doctor', ${d.phone}, ${now}, ${d.specialty}, ${d.licenseNumber}, ${d.consultationFee}, ${JSON.stringify(availableHours)})
        ON CONFLICT (id) DO NOTHING
      `;
      await sql`
        INSERT INTO user_passwords (user_id, hash) VALUES (${d.id}, ${hash})
        ON CONFLICT (user_id) DO NOTHING
      `;
    }

    return NextResponse.json({ ok: true, message: 'Base de datos inicializada correctamente' });
  } catch (err) {
    console.error('Init error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
