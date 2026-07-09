import { NextRequest, NextResponse } from 'next/server';
import { generateToken, hashPassword } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/?error=google_auth_failed', request.url));
  }

  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = `${new URL(request.url).origin}/api/auth/google/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      return NextResponse.redirect(new URL('/?error=google_token_failed', request.url));
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/?error=google_email_missing', request.url));
    }

    const existingDoctor = await prisma.doctor.findUnique({ where: { email: googleUser.email } });
    const existingPatient = await prisma.patient.findUnique({ where: { email: googleUser.email } });

    let user: { id: string; name: string; email: string; role: string };

    if (existingDoctor) {
      user = { id: existingDoctor.id, name: existingDoctor.name, email: existingDoctor.email, role: 'doctor' };
    } else if (existingPatient) {
      user = { id: existingPatient.id, name: existingPatient.name, email: existingPatient.email, role: 'patient' };
    } else {
      const randomPassword = uuidv4();
      const passwordHash = await hashPassword(randomPassword);

      const newPatient = await prisma.patient.create({
        data: {
          email: googleUser.email,
          name: googleUser.name || googleUser.email.split('@')[0],
          passwordHash,
        },
      });

      user = { id: newPatient.id, name: newPatient.name, email: newPatient.email, role: 'patient' };
    }

    const token = generateToken(user);
    const userData = JSON.stringify(user);

    const redirectUrl = new URL(
      user.role === 'doctor' ? '/doctor/dashboard' : '/paciente/citas',
      request.url
    );
    redirectUrl.searchParams.set('token', token);
    redirectUrl.searchParams.set('user', userData);

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/?error=google_auth_error', request.url));
  }
}
