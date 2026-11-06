import { NextRequest, NextResponse } from 'next/server';
import { saveTokens } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state');
  const error = searchParams.get('error');

  const origin = new URL(request.url).origin;

  if (error || !code || !userId) {
    return NextResponse.redirect(`${origin}/doctor/calendario?gcal=error`);
  }

  try {
    const redirectUri = `${origin}/api/auth/google/calendar/callback`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await res.json();
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${origin}/doctor/calendario?gcal=no_refresh_token`);
    }

    await saveTokens(userId, tokens.access_token, tokens.refresh_token, tokens.expires_in || 3600);

    return NextResponse.redirect(`${origin}/doctor/calendario?gcal=connected`);
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    return NextResponse.redirect(`${origin}/doctor/calendario?gcal=error`);
  }
}
