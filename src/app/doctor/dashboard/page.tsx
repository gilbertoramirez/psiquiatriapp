'use client';

import { useState, useEffect } from 'react';
import { patients as patientsApi } from '@/lib/api';
import { DashboardStats } from '@/types';

interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  htmlLink?: string;
}

function getTimeFromISO(iso: string) {
  if (iso.includes('T')) return iso.split('T')[1].substring(0, 5);
  return '';
}

async function fetchTodayGCalEvents(): Promise<{ connected: boolean; events: GCalEvent[] }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return { connected: false, events: [] };
  const today = new Date().toISOString().split('T')[0];
  const timeMin = `${today}T00:00:00.000Z`;
  const timeMax = `${today}T23:59:59.999Z`;
  try {
    const res = await fetch(`/api/google-calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { connected: false, events: [] };
    const data = await res.json();
    return { connected: data.connected ?? false, events: data.events ?? [] };
  } catch {
    return { connected: false, events: [] };
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userName, setUserName] = useState('');
  const [gcalEvents, setGcalEvents] = useState<GCalEvent[]>([]);
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);
  const [gcalLoading, setGcalLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) setUserName(JSON.parse(user).name);

    patientsApi.stats().then(setStats).catch(() => {});

    fetchTodayGCalEvents().then(({ connected, events }) => {
      setGcalConnected(connected);
      setGcalEvents(events.sort((a, b) => a.start.localeCompare(b.start)));
      setGcalLoading(false);
    });
  }, []);

  const statCards = stats ? [
    { label: 'Total Pacientes', value: stats.totalPatients, color: 'bg-blue-50 text-blue-600', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { label: 'Citas Hoy', value: stats.todayAppointments, color: 'bg-green-50 text-green-600', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { label: 'Citas Esta Semana', value: stats.weekAppointments, color: 'bg-purple-50 text-purple-600', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { label: 'Pagos Pendientes', value: stats.pendingPayments, color: 'bg-orange-50 text-orange-600', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  ] : [];

  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenida, {userName}</h1>
        <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats ? statCards.map((card, i) => (
          <div key={i} className="card">
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              {card.icon}
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        )) : Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-gray-100 mb-3" />
            <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-24" />
          </div>
        ))}
      </div>

      {/* Today's calendar events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Citas de Hoy</h2>
          {gcalConnected && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              Google Calendar
            </div>
          )}
        </div>

        {gcalLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : !gcalConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Google Calendar no conectado</p>
            <a href="/doctor/calendario" className="mt-2 inline-block text-xs text-blue-500 hover:underline">
              Conectar en Calendario →
            </a>
          </div>
        ) : gcalEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No hay eventos en tu Google Calendar hoy</p>
            <a href="/doctor/calendario" className="mt-2 inline-block text-xs text-salmon-500 hover:underline">
              + Agendar cita
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {gcalEvents.map(event => {
              const startTime = getTimeFromISO(event.start);
              const endTime = getTimeFromISO(event.end);
              const initials = event.summary.split(' ').filter(w => /^[A-Za-záéíóúñÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('');
              return (
                <div key={event.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                      {initials || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{event.summary}</p>
                      {(startTime || endTime) && (
                        <p className="text-sm text-gray-500">{startTime}{endTime ? ` - ${endTime}` : ''} hrs</p>
                      )}
                    </div>
                  </div>
                  {event.htmlLink && (
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 text-xs text-blue-500 hover:text-blue-700 hover:underline">
                      Ver →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
