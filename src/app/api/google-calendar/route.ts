import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { listEvents, hasCalendarConnected, deleteEvent } from '@/lib/google-calendar';

function getUser(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.substring(7));
}

export async function GET(request: NextRequest) {
  const user = getUser(request);
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get('timeMin') || new Date().toISOString();
  const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const connected = await hasCalendarConnected(user.id);
  if (!connected) {
    return NextResponse.json({ connected: false, events: [] });
  }

  const events = await listEvents(user.id, timeMin, timeMax);
  return NextResponse.json({ connected: true, events });
}

export async function DELETE(request: NextRequest) {
  const user = getUser(request);
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId');
  if (!eventId) return NextResponse.json({ error: 'eventId requerido' }, { status: 400 });

  await deleteEvent(user.id, eventId);
  return new NextResponse(null, { status: 204 });
}
