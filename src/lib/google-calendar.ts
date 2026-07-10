import { google } from 'googleapis';

function getOAuth2Client() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!refreshToken) return null;

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

interface CalendarEventParams {
  patientName: string;
  patientEmail: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  modality: string;
  address?: string;
}

export async function createCalendarEvent(params: CalendarEventParams): Promise<{ meetLink: string | null; eventId: string | null }> {
  const auth = getOAuth2Client();
  if (!auth) {
    console.warn('Google Calendar not configured — skipping event creation');
    return { meetLink: null, eventId: null };
  }

  const calendar = google.calendar({ version: 'v3', auth });

  const typeLabels: Record<string, string> = {
    initial: 'Primera consulta',
    followup: 'Seguimiento',
    emergency: 'Urgencia',
  };

  const startDateTime = `${params.date}T${params.startTime}:00`;
  const endDateTime = `${params.date}T${params.endTime}:00`;
  const timeZone = 'America/Mexico_City';

  const isOnline = params.modality === 'online';

  const event: Record<string, unknown> = {
    summary: `Consulta Psiquiátrica - ${params.patientName}`,
    description: [
      `Paciente: ${params.patientName}`,
      `Tipo: ${typeLabels[params.type] || params.type}`,
      `Modalidad: ${isOnline ? 'En línea (Google Meet)' : 'Presencial'}`,
      !isOnline && params.address ? `Dirección: ${params.address}` : '',
    ].filter(Boolean).join('\n'),
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
    attendees: [{ email: params.patientEmail }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };

  if (!isOnline && params.address) {
    event.location = params.address;
  }

  if (isOnline) {
    event.conferenceData = {
      createRequest: {
        requestId: `psiquiatriapp-${Date.now()}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: isOnline ? 1 : 0,
      sendUpdates: 'all',
    });

    const meetLink = response.data.conferenceData?.entryPoints
      ?.find(ep => ep.entryPointType === 'video')?.uri || null;

    return {
      meetLink,
      eventId: response.data.id || null,
    };
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return { meetLink: null, eventId: null };
  }
}
