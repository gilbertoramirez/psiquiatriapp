'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointments as appointmentsApi, doctorPatients } from '@/lib/api';
import { Appointment, Patient } from '@/types';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface TimeSlot { time: string; available: boolean; }

interface NewApptForm {
  patientId: string;
  patientNameFree: string;
  time: string;
  type: 'initial' | 'followup' | 'urgency';
  notes: string;
}

const emptyForm: NewApptForm = { patientId: '', patientNameFree: '', time: '', type: 'followup', notes: '' };

function NewAppointmentModal({
  date, patients, slots, slotsLoading, saving, error,
  form, onChange, onSubmit, onClose,
}: {
  date: string;
  patients: Patient[];
  slots: TimeSlot[];
  slotsLoading: boolean;
  saving: boolean;
  error: string;
  form: NewApptForm;
  onChange: (f: NewApptForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
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
          {/* Patient selector */}
          <div>
            <label className={labelCls}>Paciente <span className="text-red-500">*</span></label>
            {patients.length > 0 ? (
              <select
                className={fieldCls}
                value={form.patientId}
                onChange={e => onChange({ ...form, patientId: e.target.value, patientNameFree: '' })}
              >
                <option value="">-- Seleccionar paciente --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
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
              <input
                className={fieldCls}
                value={form.patientNameFree}
                onChange={e => onChange({ ...form, patientNameFree: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>
          )}

          {/* Time slot */}
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
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => onChange({ ...form, time: s.time })}
                    className={`py-1.5 text-xs rounded-lg border transition-colors ${
                      form.time === s.time
                        ? 'bg-salmon-400 text-white border-salmon-400'
                        : s.available
                        ? 'border-gray-200 hover:border-salmon-300 text-gray-700'
                        : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                    }`}
                  >
                    {s.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type */}
          <div>
            <label className={labelCls}>Tipo de consulta</label>
            <div className="flex gap-2">
              {[
                { value: 'initial', label: 'Primera vez' },
                { value: 'followup', label: 'Seguimiento' },
                { value: 'urgency', label: 'Urgencia' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...form, type: opt.value as NewApptForm['type'] })}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                    form.type === opt.value
                      ? 'bg-salmon-50 border-salmon-300 text-salmon-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notas (opcional)</label>
            <textarea
              className={fieldCls}
              rows={2}
              value={form.notes}
              onChange={e => onChange({ ...form, notes: e.target.value })}
              placeholder="Motivo de consulta, observaciones..."
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || slots.length === 0}
              className="flex-1 py-2 text-sm bg-salmon-400 text-white rounded-lg hover:bg-salmon-500 disabled:opacity-50 font-medium"
            >
              {saving ? 'Agendando...' : 'Agendar cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  // New appointment state
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [form, setForm] = useState<NewApptForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const loadAppointments = useCallback(async () => {
    try {
      const data = await appointmentsApi.list();
      setAllAppointments(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  useEffect(() => {
    doctorPatients.list().then(setPatients).catch(() => {});
  }, []);

  async function openModal() {
    if (!selectedDate) return;
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
    setSlotsLoading(true);
    try {
      const data = await appointmentsApi.slots(selectedDate);
      setSlots(data);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) return;

    const needsFreePatient = form.patientId === '__free__' || patients.length === 0;
    if (needsFreePatient && !form.patientNameFree.trim()) {
      setFormError('Ingresa el nombre del paciente');
      return;
    }
    if (!needsFreePatient && !form.patientId) {
      setFormError('Selecciona un paciente');
      return;
    }
    if (!form.time) {
      setFormError('Selecciona una hora');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      const payload: Record<string, string> = {
        date: selectedDate,
        startTime: form.time,
        type: form.type,
        notes: form.notes,
      };

      if (needsFreePatient) {
        payload.patientNameFree = form.patientNameFree.trim();
        payload.patientId = '';
      } else {
        payload.patientId = form.patientId;
      }

      // doctorId will be resolved server-side from the token
      payload.doctorId = 'self';

      await appointmentsApi.create(payload);
      await loadAppointments();
      setShowModal(false);
      setSuccess('Cita agendada correctamente');
      setTimeout(() => setSuccess(''), 3000);
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

  const getAppointmentsForDate = (dateStr: string) =>
    allAppointments.filter(a => a.date === dateStr && a.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const selectedAppts = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-400',
    confirmed: 'bg-green-400',
    completed: 'bg-blue-400',
    cancelled: 'bg-red-400',
  };

  const getWeekDays = () => {
    const start = new Date();
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  return (
    <div className="max-w-6xl mx-auto">
      {showModal && selectedDate && (
        <NewAppointmentModal
          date={selectedDate}
          patients={patients}
          slots={slots}
          slotsLoading={slotsLoading}
          saving={saving}
          error={formError}
          form={form}
          onChange={setForm}
          onSubmit={handleCreate}
          onClose={() => setShowModal(false)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Citas</h1>
          <p className="text-gray-500 text-sm mt-1">Vista general de todas tus citas</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedDate && (
            <>
              <button
                onClick={() => {
                  const url = `https://outlook.office.com/book/ConsultaZUNO@alesca.com.mx/?selectedDate=${selectedDate}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Agendar en Bookings
              </button>
              <button
                onClick={openModal}
                className="flex items-center gap-2 px-4 py-2 bg-salmon-400 text-white rounded-lg hover:bg-salmon-500 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Nueva Cita
              </button>
            </>
          )}
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Mes</button>
            <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'week' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Semana</button>
          </div>
        </div>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>
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
                const dayAppts = getAppointmentsForDate(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;

                return (
                  <button key={day} onClick={() => setSelectedDate(dateStr)}
                    className={`relative p-2 min-h-[60px] rounded-lg text-left transition-all ${
                      isSelected ? 'bg-salmon-50 ring-2 ring-salmon-400' :
                      isToday ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}>
                    <span className={`text-sm ${isToday ? 'font-bold text-salmon-500' : 'text-gray-700'}`}>{day}</span>
                    <div className="mt-1 space-y-0.5">
                      {dayAppts.slice(0, 3).map(a => (
                        <div key={a.id} className={`w-full h-1.5 rounded-full ${statusColors[a.status]}`}></div>
                      ))}
                      {dayAppts.length > 3 && <p className="text-[10px] text-gray-400">+{dayAppts.length - 3} más</p>}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-yellow-400"></div> Agendada</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-green-400"></div> Confirmada</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-blue-400"></div> Completada</div>
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
                  <button
                    onClick={openModal}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-salmon-400 text-white rounded-lg hover:bg-salmon-500"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nueva
                  </button>
                </div>
                {selectedAppts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">Sin citas este día</p>
                    <button onClick={openModal} className="mt-3 text-xs text-salmon-500 hover:underline">
                      + Agendar cita
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedAppts.map(apt => (
                      <div key={apt.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{apt.patientName}</p>
                          <span className={`w-2 h-2 rounded-full ${statusColors[apt.status]}`}></span>
                        </div>
                        <p className="text-xs text-gray-500">{apt.startTime} - {apt.endTime}</p>
                        <p className="text-xs text-gray-400 capitalize mt-1">
                          {apt.type === 'initial' ? 'Primera consulta' : apt.type === 'followup' ? 'Seguimiento' : 'Urgencia'}
                        </p>
                      </div>
                    ))}
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
                  const hourAppts = getAppointmentsForDate(dateStr).filter(a => parseInt(a.startTime.split(':')[0]) === hour);
                  return (
                    <div
                      key={`${dateStr}-${hour}`}
                      className="border-l p-0.5 cursor-pointer hover:bg-salmon-50 group"
                      onClick={() => { setSelectedDate(dateStr); setView('month'); }}
                    >
                      {hourAppts.map(a => (
                        <div key={a.id} className={`text-[10px] p-1 rounded ${a.status === 'confirmed' ? 'bg-green-100 text-green-800' : a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          <p className="font-medium truncate">{a.patientName}</p>
                          <p>{a.startTime}</p>
                        </div>
                      ))}
                      {hourAppts.length === 0 && (
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
