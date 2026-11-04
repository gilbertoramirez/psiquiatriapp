import { NextRequest, NextResponse } from 'next/server';
import { getSql } from '@/lib/pg';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  if (!secret || secret !== process.env.INIT_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ error: 'DATABASE_URL no configurado', db: false });
  }

  try {
    const doctors = await sql`SELECT id, email, name, role FROM users WHERE role = 'doctor'`;
    const passwords = await sql`SELECT user_id, LEFT(hash, 7) as hash_prefix FROM user_passwords`;
    return NextResponse.json({ db: true, doctors, passwords });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
