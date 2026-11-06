import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getOAuthUrl } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const user = verifyToken(auth.substring(7));
  if (!user || user.role !== 'doctor') {
    return NextResponse.json({ error: 'Solo doctores' }, { status: 403 });
  }

  const url = getOAuthUrl(user.id);
  return NextResponse.json({ url });
}
