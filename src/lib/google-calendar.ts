import { getSql } from './pg';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://psiquiatriapp.vercel.app';

export function getOAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${APP_URL}/api/auth/google/calendar/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function saveTokens(userId: string, accessToken: string, refreshToken: string, expiresIn: number) {
  const sql = getSql();
  if (!sql) return;
  const expiry = Date.now() + expiresIn * 1000;
  const now = new Date().toISOString();
  await sql`
    INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, expiry_date, updated_at)
    VALUES (${userId}, ${accessToken}, ${refreshToken}, ${expiry}, ${now})
    ON CONFLICT (user_id) DO UPDATE SET
      access_token = ${accessToken}, refresh_token = ${refreshToken},
      expiry_date = ${expiry}, updated_at = ${now}
  `;
}

export async function hasCalendarConnected(userId: string): Promise<boolean> {
  const sql = getSql();
  if (!sql) return false;
  const rows = await sql`SELECT user_id FROM google_calendar_tokens WHERE user_id = ${userId}`;
  return rows.length > 0;
}

async function getAccessToken(userId: string): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = await sql`SELECT * FROM google_calendar_tokens WHERE user_id = ${userId}`;
  if (!rows[0]) return null;
  const row = rows[0] as Record<string, unknown>;
  const expiry = Number(row.expiry_date);
  if (expiry && Date.now() < expiry - 60000) return row.access_token as string;

  // Refresh
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: row.refresh_token as string,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) return null;
  const newExpiry = Date.now() + (data.expires_in || 3600) * 1000;
  await sql`UPDATE google_calendar_tokens SET access_token = ${data.access_token}, expiry_date = ${newExpiry}, updated_at = ${new Date().toISOString()} WHERE user_id = ${userId}`;
  return data.access_token;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  htmlLink?: string;
}

export async function listEvents(userId: string, timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const token = await getAccessToken(userId);
  if (!token) return [];
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '200' });
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.items) return [];
  return data.items.map((e: Record<string, unknown>) => {
    const s = e.start as Record<string, string>;
    const en = e.end as Record<string, string>;
    return { id: e.id as string, summary: (e.summary as string) || 'Sin título', description: e.description as string | undefined, start: s.dateTime || s.date, end: en.dateTime || en.date, htmlLink: e.htmlLink as string | undefined };
  });
}

export async function createEvent(userId: string, event: { summary: string; description?: string; startDateTime: string; endDateTime: string; attendeeEmail?: string }): Promise<CalendarEvent | null> {
  const token = await getAccessToken(userId);
  if (!token) return null;
  const body: Record<string, unknown> = {
    summary: event.summary,
    description: event.description,
    start: { dateTime: `${event.startDateTime}:00`, timeZone: 'America/Mexico_City' },
    end: { dateTime: `${event.endDateTime}:00`, timeZone: 'America/Mexico_City' },
    conferenceData: { createRequest: { requestId: `${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
  };
  if (event.attendeeEmail) {
    body.attendees = [{ email: event.attendeeEmail }];
  }
  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.id) return null;
  const s = data.start as Record<string, string>;
  const en = data.end as Record<string, string>;
  return { id: data.id, summary: data.summary, description: data.description, start: s.dateTime || s.date, end: en.dateTime || en.date, htmlLink: data.htmlLink };
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  const token = await getAccessToken(userId);
  if (!token) return;
  await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
