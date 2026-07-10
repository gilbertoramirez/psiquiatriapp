import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getToken(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id, userRole: user.role },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: NextRequest) {
  const user = getToken(request);
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    if (body.all) {
      await prisma.notification.updateMany({
        where: { userId: user.id, userRole: user.role, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      const notification = await prisma.notification.findUnique({ where: { id: body.id } });
      if (!notification || notification.userId !== user.id) {
        return NextResponse.json({ error: 'No encontrada' }, { status: 404 });
      }
      await prisma.notification.update({
        where: { id: body.id },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Error al actualizar notificación' }, { status: 500 });
  }
}
