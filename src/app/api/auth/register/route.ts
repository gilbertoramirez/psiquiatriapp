import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: 'El registro público no está disponible. Solicita una invitación a tu doctora.' }, { status: 403 });
}
