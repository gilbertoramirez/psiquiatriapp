import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'doctor') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const { signatureData } = await req.json();
  if (!signatureData) {
    return NextResponse.json({ error: 'signatureData requerido' }, { status: 400 });
  }

  await prisma.doctor.update({
    where: { id: decoded.id },
    data: { signatureData },
  });

  return NextResponse.json({ success: true });
}
