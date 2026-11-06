'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { appointments as appointmentsApi, doctorPatients } from '@/lib/api';
import { Appointment, Patient } from '@/types';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  htmlLink?: string;
  source: 'google' | 'app';
}

interface TimeSlot { time: string; available: boolean; }

interface NewApptForm {
  patientId: string;
  patientNameFree: string;
  time: string;
  type: 'initial' | 'followup' | 'urgency';
  notes: string;
}

const emptyForm: NewApptForm = { patientId: '', patientNameFree: '', time: '', type: 'followup', notes: '' };

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function fetchGcalStatus(): Promise<{ connected: boolean; events: CalendarEvent[] }> {
  const token = getToken();
  if (!token) return { connected: false, events: [] };
  const now = new Date();
  const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const timeMax = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString();
  const res = await fetch(`/api/google-calendar?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { connected: false, events: [] };
  const data = await res.json();
  return {
    connected: data.connected ?? false,
    events: (data.events || []).map((e: CalendarEvent) => ({ ...e, source: 'google' as const })),
  };
}

async function getOAuthUrl(): Promise<string | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch('/api/auth/google/calendar', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.url || null;
}

function NewAppointmentModal({
  date, patients, slots, slotsLoading, saving, error,
  form, onChange, onSubmit, onClose,
}: {
  date: string; patients: Patient[]; slots: TimeSlot[]; slotsLoading: boolean;
  saving: boolean; error: string; form: NewApptForm;
  onChange: (f: NewApptForm) => void; onSubmit: (e: React.FormEvent) => void; onClose: () => void;
}) {
  const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salmon-400";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-800">Nueva Cita</h2>
            <p className="text-xs text-gray-500 capitalize mt-0.5">{displayDate}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelCls}>Paciente <span className="text-red-500">*</span></label>
            {patients.length > 0 ? (
              <select className={fieldCls} value={form.patientId} onChange={e => onChange({ ...form, patientId: e.target.value, patientNameFree: '' })}>
                <option value="">-- Seleccionar paciente --</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="__free__">Otro (escribir nombre)</option>
              </select>
            ) : (
              <select className={fieldCls} value="__free__" disabled>
                <option value="__free__">Escribir nombre manualmente</option>
              </select>
            )}
          </div>

          {(form.patientId === '__free__' || patients.length === 0) && (
            <div>
              <label className={labelCls}>Nombre del paciente <span className="text-red-500">*</span></label>
              <input className={fieldCls} value={form.patientNameFree} onChange={e => onChange({ ...form, patientNameFree: e.target.value })} placeholder="Nombre completo" />
            </div>
          )}

          <div>
            <label className={labelCls}>Hora <span className="text-red-500">*</span></label>
            {slotsLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                <div className="animate-spin w-4 h-4 border-2 border-salmon-400 border-t-transparent rounded-full" />
                Cargando horarios...
              </div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No hay horarios disponibles este día</p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map(s => (
                  <button key={s.time} type="button" disabled={!s.available} onClick={() => onChange({ ...form, time: s.time })}
                    className={`py-1.5 text-xs rounded-lg border transition-colors ${
                      form.time === s.time ? 'bg-salmon-400 text-white border-salmon-400'
                        : s.available ? 'border-gray-200 hover:border-salmon-300 text-gray-700'
                        : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                    }`}>
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Tipo de consulta</label>
            <div className="flex gap-2">
              {[{ value: 'initial', label: 'Primera vez' }, { value: 'followup', label: 'Seguimiento' }, { value: 'urgency', label: 'Urgencia' }].map(opt => (
                <button key={opt.value} type="button" onClick={() => onChange({ ...form, type: opt.value as NewApptForm['type'] })}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                    form.type === opt.value ? 'bg-salmon-50 border-salmon-300 text-salmon-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Notas (opcional)</label>
            <textarea className={fieldCls} rows={2} value={form.notes} onChange={e => onChange({ ...form, notes: e.target.value })} placeholder="Motivo de consulta, observaciones..." />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving || slots.length === 0}
              className="flex-1 py-2 text-sm bg-salmon-400 text-white rounded-lg hover:bg-salmon-500 disabled:opacity-50 font-medium">
              {saving ? 'Agendando...' : 'Agendar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  const searchParams = useSearchParams();
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [gcalConnected, setGcalConnected] = useState<boolean | null>(null);
  const [gcalEvents, setGcalEvents] = useState<CalendarEvent[]>([]);
  const [gcalLoading, setGcalLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [connectingGcal, setConnectingGcal] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm] = useState<NewApptForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [gcalNotice, setGcalNotice] = useState('');

  const loadAppointments = useCallback(async () => {
    try { setAllAppointments(await appointmentsApi.list()); } catch { /* ignore */ }
  }, []);

  const loadGcal = useCallback(async () => {
    setGcalLoading(true);
    try {
      const { connected, events } = await fetchGcalStatus();
      setGcalConnected(connected);
      setGcalEvents(events);
    } catch {
      setGcalConnected(false);
    } finally {
      setGcalLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadGcal();
    doctorPatients.list().then(setPatients).catch(() => {});
  }, [loadAppointments, loadGcal]);

  // Handle OAuth callback result
  useEffect(() => {
    const gcal = searchParams.get('gcal');
    if (gcal === 'connected') {
      setGcalNotice('Google Calendar conectado correctamente');
      loadGcal();
      setTimeout(() => setGcalNotice(''), 5000);
    } else if (gcal === 'error') {
      setGcalNotice('Error al conectar Google Calendar. Intenta de nuevo.');
      setTimeout(() => setGcalNotice(''), 5000);
    } else if (gcal === 'no_refresh_token') {
      setGcalNotice('No se obtuvo acceso permanente. Intenta de nuevo.');
      setTimeout(() => setGcalNotice(''), 5000);
    }
  }, [searchParams, loadGcal]);

  async function handleConnectGcal() {
    setConnectingGcal(true);
    try {
      const url = await getOAuthUrl();
      if (url) window.location.href = url;
      else setGcalNotice('No se pudo obtener el enlace de autorización.');
    } catch {
      setGcalNotice('Error al iniciar conexión con Google Calendar.');
    } finally {
      setConnectingGcal(false);
    }
  }

  async function openModal() {
    if (!selectedDate) return;
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
    setSlotsLoading(true);
    try { setSlots(await appointmentsApi.slots(selectedDate)); }
    catch { setSlots([]); }
    finally { setSlotsLoading(false); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) return;

    const needsFreePatient = form.patientId === '__free__' || patients.length === 0;
    if (needsFreePatient && !form.patientNameFree.trim()) { setFormError('Ingresa el nombre del paciente'); return; }
    if (!needsFreePatient && !form.patientId) { setFormError('Selecciona un paciente'); return; }
    if (!form.time) { setFormError('Selecciona una hora'); return; }

    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, string> = { date: selectedDate, startTime: form.time, type: form.type, notes: form.notes, doctorId: 'self' };
      if (needsFreePatient) { payload.patientNameFree = form.patientNameFree.trim(); payload.patientId = ''; }
      else payload.patientId = form.patientId;

      await appointmentsApi.create(payload);
      await loadAppointments();
      await loadGcal();
      setShowModal(false);
      setSuccess(gcalConnected ? 'Cita agendada y guardada en Google Calendar' : 'Cita agendada correctamente');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error al agendar');
    } finally {
      setSaving(false);
    }
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  function getItemsForDate(dateStr: string) {
    const appAppts = allAppointments.filter(a => a.date === dateStr && a.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const gcalForDate = gcalEvents.filter(e => {
      const eDate = e.start.split('T')[0];
      return eDate === dateStr;
    });
    return { appAppts, gcalForDate };
  }

  function getTimeFromISO(iso: string) {
    if (iso.includes('T')) {
      const t = iso.split('T')[1];
      return t.substring(0, 5);
    }
    return '';
  }

  const selectedItems = selectedDate ? getItemsForDate(selectedDate) : null;

  const getWeekDays = () => {
    const start = new Date();
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  if (gcalLoading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-salmon-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not connected: show prominent connect screen
  if (gcalConnected === false) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Citas</h1>
          <p className="text-gray-500 text-sm mt-1">Conecta tu Google Calendar para gestionar tus citas</p>
        </div>

        {gcalNotice && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{gcalNotice}</div>
        )}

        <div className="card max-w-lg mx-auto text-center py-14 px-8">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-blue-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zM4.5 19.5v-12h15v12h-15z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Conecta Google Calendar</h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            Tu calendario de psiquiatriapp está sincronizado con Google Calendar. Conecta tu cuenta para ver y gestionar todas tus citas en un solo lugar.
          </p>
          <button
            onClick={handleConnectGcal}
            disabled={connectingGcal}
            className="inline-flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 font-medium text-gray-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {connectingGcal ? 'Conectando...' : 'Conectar con Google Calendar'}
          </button>
          <p className="text-xs text-gray-400 mt-4">Solo se solicita acceso a tus eventos de calendario</p>
        </div>
      </div>
    );
  }

  // Connected: full calendar with Google Calendar as primary
  return (
    <div className="max-w-6xl mx-auto">
      {showModal && selectedDate && (
        <NewAppointmentModal
          date={selectedDate} patients={patients} slots={slots} slotsLoading={slotsLoading}
          saving={saving} error={formError} form={form} onChange={setForm}
          onSubmit={handleCreate} onClose={() => setShowModal(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Citas</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            <p className="text-gray-500 text-sm">Google Calendar conectado</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedDate && (
            <button onClick={openModal} className="flex items-center gap-2 px-4 py-2 bg-salmon-400 text-white rounded-lg hover:bg-salmon-500 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nueva Cita
            </button>
          )}
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Mes</button>
            <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'week' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Semana</button>
          </div>
        </div>
      </div>

      {(success || gcalNotice) && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${gcalNotice && !success ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {success || gcalNotice}
        </div>
      )}

      {view === 'month' ? (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-lg font-semibold">{MONTH_NAMES[month]} {year}</h2>
              <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const { appAppts, gcalForDate } = getItemsForDate(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const totalItems = appAppts.length + gcalForDate.length;

                return (
                  <button key={day} onClick={() => setSelectedDate(dateStr)}
                    className={`relative p-2 min-h-[60px] rounded-lg text-left transition-all ${
                      isSelected ? 'bg-salmon-50 ring-2 ring-salmon-400' : isToday ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}>
                    <span className={`text-sm ${isToday ? 'font-bold text-salmon-500' : 'text-gray-700'}`}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {appAppts.slice(0, 2).map(a => (
                        <div key={a.id} className="w-full h-1.5 rounded-full bg-salmon-400"></div>
                      ))}
                      {gcalForDate.slice(0, 2).map(e => (
                        <div key={e.id} className="w-full h-1.5 rounded-full bg-blue-400"></div>
                      ))}
                      {totalItems > 2 && <p className="text-[10px] text-gray-400">+{totalItems - 2}</p>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-salmon-400"></div> Cita psiquiatriapp</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-blue-400"></div> Evento Google Calendar</div>
            </div>
          </div>

          {/* Selected date panel */}
          <div className="card">
            {selectedDate ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h3 className="font-semibold text-lg capitalize">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <button onClick={openModal} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-salmon-400 text-white rounded-lg hover:bg-salmon-500">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nueva
                  </button>
                </div>

                {(!selectedItems || (selectedItems.appAppts.length === 0 && selectedItems.gcalForDate.length === 0)) ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">Sin citas ni eventos este día</p>
                    <button onClick={openModal} className="mt-3 text-xs text-salmon-500 hover:underline">+ Agendar cita</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedItems?.appAppts.map(apt => (
                      <div key={apt.id} className="p-3 bg-salmon-50 rounded-lg border border-salmon-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm text-gray-800">{apt.patientName}</p>
                          <span className="text-[10px] text-salmon-600 font-medium">Psiquiatriapp</span>
                        </div>
                        <p className="text-xs text-gray-500">{apt.startTime} - {apt.endTime}</p>
                        <p className="text-xs text-gray-400 capitalize mt-0.5">
                          {apt.type === 'initial' ? 'Primera consulta' : apt.type === 'followup' ? 'Seguimiento' : 'Urgencia'}
                        </p>
                      </div>
                    ))}
                    {selectedItems?.gcalForDate.map(event => {
                      const startTime = getTimeFromISO(event.start);
                      const endTime = getTimeFromISO(event.end);
                      return (
                        <div key={event.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm text-gray-800 truncate pr-2">{event.summary}</p>
                            <span className="text-[10px] text-blue-600 font-medium flex-shrink-0">Google</span>
                          </div>
                          {(startTime || endTime) && (
                            <p className="text-xs text-gray-500">{startTime}{endTime ? ` - ${endTime}` : ''}</p>
                          )}
                          {event.htmlLink && (
                            <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 inline-block">
                              Ver en Google Calendar →
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-sm">Selecciona un día para ver detalles o agendar una cita</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Week view */
        <div className="card overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-8 gap-0 border-b">
              <div className="p-2 text-xs text-gray-400">Hora</div>
              {weekDays.map(d => {
                const dateStr = d.toISOString().split('T')[0];
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                return (
                  <div key={dateStr} className={`p-2 text-center border-l ${isToday ? 'bg-salmon-50' : ''}`}>
                    <p className="text-xs text-gray-500">{DAY_NAMES[d.getDay()].slice(0, 3)}</p>
                    <p className={`text-lg font-semibold ${isToday ? 'text-salmon-500' : 'text-gray-900'}`}>{d.getDate()}</p>
                  </div>
                );
              })}
            </div>

            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-0 border-b min-h-[50px]">
                <div className="p-2 text-xs text-gray-400 flex items-start">{String(hour).padStart(2, '0')}:00</div>
                {weekDays.map(d => {
                  const dateStr = d.toISOString().split('T')[0];
                  const { appAppts, gcalForDate } = getItemsForDate(dateStr);
                  const hourAppAppts = appAppts.filter(a => parseInt(a.startTime.split(':')[0]) === hour);
                  const hourGcal = gcalForDate.filter(e => {
                    const t = getTimeFromISO(e.start);
                    return t ? parseInt(t.split(':')[0]) === hour : false;
                  });
                  return (
                    <div key={`${dateStr}-${hour}`} className="border-l p-0.5 cursor-pointer hover:bg-salmon-50 group"
                      onClick={() => { setSelectedDate(dateStr); setView('month'); }}>
                      {hourAppAppts.map(a => (
                        <div key={a.id} className="text-[10px] p-1 rounded bg-salmon-100 text-salmon-800 mb-0.5">
                          <p className="font-medium truncate">{a.patientName}</p>
                          <p>{a.startTime}</p>
                        </div>
                      ))}
                      {hourGcal.map(e => (
                        <div key={e.id} className="text-[10px] p-1 rounded bg-blue-100 text-blue-800 mb-0.5">
                          <p className="font-medium truncate">{e.summary}</p>
                          <p>{getTimeFromISO(e.start)}</p>
                        </div>
                      ))}
                      {hourAppAppts.length === 0 && hourGcal.length === 0 && (
                        <div className="hidden group-hover:flex items-center justify-center h-full">
                          <span className="text-[9px] text-salmon-400">+ cita</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
