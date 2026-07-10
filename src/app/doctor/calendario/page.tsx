'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointments as appointmentsApi, patients as patientsApi } from '@/lib/api';
import { Appointment } from '@/types';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const MODALITY_LABELS: Record<string, string> = {
  both: 'Presencial y en línea',
  online: 'En línea',
  'in-person': 'Presencial',
  presencial: 'Presencial',
};

const dayNames: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

interface PatientOption {
  id: string;
  name: string;
  email: string;
}

interface DoctorInfo {
  id: string;
  name: string;
  availableHours: Record<string, { start: string; end: string }[]>;
  modalityByDay: Record<string, string> | null;
}

function generateTimeSlots(date: Date, existingAppointments: Appointment[], doctorHours: Record<string, { start: string; end: string }[]>): { time: string; available: boolean }[] {
  const dayOfWeek = date.getDay();
  const dn = dayNames[dayOfWeek];
  const slots = doctorHours[dn];
  if (!slots) return [];

  const dateStr = date.toISOString().split('T')[0];
  const bookedTimes = existingAppointments
    .filter(a => a.date === dateStr && a.status !== 'cancelled')
    .map(a => a.startTime);

  const timeSlots: { time: string; available: boolean }[] = [];
  slots.forEach(slot => {
    const [startH, startM] = slot.start.split(':').map(Number);
    const [endH, endM] = slot.end.split(':').map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    while (current < end) {
      const time = `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`;
      timeSlots.push({ time, available: !bookedTimes.includes(time) });
      current += 60;
    }
  });
  return timeSlots;
}

export default function CalendarioPage() {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [patientsList, setPatientsList] = useState<PatientOption[]>([]);
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const [showNewAppt, setShowNewAppt] = useState(false);
  const [newApptDate, setNewApptDate] = useState<Date | null>(null);
  const [newApptTime, setNewApptTime] = useState<string | null>(null);
  const [newApptPatient, setNewApptPatient] = useState('');
  const [newApptType, setNewApptType] = useState('followup');
  const [newApptModality, setNewApptModality] = useState('in-person');
  const [newApptTimeSlots, setNewApptTimeSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadAppointments = useCallback(async () => {
    try {
      const data = await appointmentsApi.list();
      setAllAppointments(data);
    } catch { /* ignore */ }
  }, []);

  const loadPatients = useCallback(async () => {
    try {
      const data = await patientsApi.list();
      setPatientsList(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadAppointments();
    loadPatients();
    fetch('/api/doctors')
      .then(r => r.json())
      .then((docs: DoctorInfo[]) => { if (docs.length > 0) setDoctor(docs[0]); })
      .catch(() => {});
  }, [loadAppointments, loadPatients]);

  useEffect(() => {
    if (newApptDate && doctor) {
      setNewApptTimeSlots(generateTimeSlots(newApptDate, allAppointments, doctor.availableHours));
      setNewApptTime(null);
      const dayModality = doctor.modalityByDay?.[dayNames[newApptDate.getDay()]];
      if (dayModality === 'online') setNewApptModality('online');
      else if (dayModality === 'in-person' || dayModality === 'presencial') setNewApptModality('in-person');
    }
  }, [newApptDate, allAppointments, doctor]);

  const handleCreateAppointment = async () => {
    if (!newApptDate || !newApptTime || !newApptPatient) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await appointmentsApi.create({
        patientId: newApptPatient,
        date: newApptDate.toISOString().split('T')[0],
        startTime: newApptTime,
        type: newApptType,
        modality: newApptModality,
      });
      setMessage({ type: 'success', text: 'Cita creada exitosamente' });
      setShowNewAppt(false);
      setNewApptDate(null);
      setNewApptTime(null);
      setNewApptPatient('');
      loadAppointments();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al crear cita' });
    } finally {
      setLoading(false);
    }
  };

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
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [newApptCalMonth, setNewApptCalMonth] = useState(new Date());
  const nYear = newApptCalMonth.getFullYear();
  const nMonth = newApptCalMonth.getMonth();
  const nFirstDay = new Date(nYear, nMonth, 1).getDay();
  const nDaysInMonth = new Date(nYear, nMonth + 1, 0).getDate();
  const nCalendarDays: (number | null)[] = [];
  for (let i = 0; i < nFirstDay; i++) nCalendarDays.push(null);
  for (let d = 1; d <= nDaysInMonth; d++) nCalendarDays.push(d);

  const isAvailableDay = (day: number) => {
    if (!doctor) return false;
    const date = new Date(nYear, nMonth, day);
    if (date < today) return false;
    const dn = dayNames[date.getDay()];
    return !!doctor.availableHours[dn];
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Citas</h1>
          <p className="text-gray-500 text-sm mt-1">Vista general de todas tus citas</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowNewAppt(!showNewAppt); setMessage({ type: '', text: '' }); }} className="btn-primary">
            {showNewAppt ? 'Ver Calendario' : '+ Nueva Cita'}
          </button>
          <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Mes</button>
            <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'week' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Semana</button>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {showNewAppt ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Selecciona fecha</h3>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setNewApptCalMonth(new Date(nYear, nMonth - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-lg font-semibold">{MONTH_NAMES[nMonth]} {nYear}</h2>
              <button onClick={() => setNewApptCalMonth(new Date(nYear, nMonth + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {nCalendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const available = isAvailableDay(day);
                const isSelected = newApptDate && newApptDate.getDate() === day && newApptDate.getMonth() === nMonth && newApptDate.getFullYear() === nYear;
                const isToday = today.getDate() === day && today.getMonth() === nMonth && today.getFullYear() === nYear;

                return (
                  <button
                    key={day}
                    disabled={!available}
                    onClick={() => setNewApptDate(new Date(nYear, nMonth, day))}
                    className={`relative p-2 text-sm rounded-lg transition-all ${
                      isSelected ? 'bg-salmon-400 text-white font-bold shadow-md' :
                      isToday ? 'bg-salmon-50 text-salmon-700 font-semibold' :
                      available ? 'hover:bg-salmon-50 text-gray-700 cursor-pointer' :
                      'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            {newApptDate ? (
              <>
                <h3 className="font-semibold text-lg mb-1">
                  {DAY_NAMES[newApptDate.getDay()]} {newApptDate.getDate()} de {MONTH_NAMES[newApptDate.getMonth()]}
                </h3>

                <div className="mb-4">
                  <label className="label-field">Paciente</label>
                  <select value={newApptPatient} onChange={e => setNewApptPatient(e.target.value)} className="input-field">
                    <option value="">Selecciona un paciente</option>
                    {patientsList.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.email})</option>
                    ))}
                  </select>
                </div>

                <p className="text-gray-500 text-sm mb-2">Horario</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {newApptTimeSlots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setNewApptTime(slot.time)}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                        newApptTime === slot.time ? 'bg-salmon-400 text-white shadow-md' :
                        slot.available ? 'bg-gray-100 text-gray-700 hover:bg-salmon-50 hover:text-salmon-700' :
                        'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                  {newApptTimeSlots.length === 0 && (
                    <p className="col-span-3 text-gray-400 text-center py-4">No hay horarios disponibles este día</p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="label-field">Tipo de consulta</label>
                  <select value={newApptType} onChange={e => setNewApptType(e.target.value)} className="input-field">
                    <option value="initial">Primera consulta</option>
                    <option value="followup">Seguimiento</option>
                    <option value="emergency">Urgencia</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="label-field">Modalidad</label>
                  {(() => {
                    const dayModality = doctor?.modalityByDay?.[dayNames[newApptDate.getDay()]];
                    if (dayModality === 'online') {
                      return <div className="input-field bg-gray-50 text-gray-600">En línea (Google Meet)</div>;
                    }
                    if (dayModality === 'in-person' || dayModality === 'presencial') {
                      return <div className="input-field bg-gray-50 text-gray-600">Presencial</div>;
                    }
                    return (
                      <select value={newApptModality} onChange={e => setNewApptModality(e.target.value)} className="input-field">
                        <option value="in-person">Presencial</option>
                        <option value="online">En línea (Google Meet)</option>
                      </select>
                    );
                  })()}
                </div>

                {newApptPatient && newApptTime && (
                  <div className="bg-salmon-50 rounded-lg p-4 mb-4">
                    <p className="font-medium text-gray-900">
                      {patientsList.find(p => p.id === newApptPatient)?.name}
                    </p>
                    <p className="text-sm text-salmon-700">{newApptTime} hrs - {DAY_NAMES[newApptDate.getDay()]} {newApptDate.getDate()}/{newApptDate.getMonth() + 1}/{newApptDate.getFullYear()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {newApptModality === 'online' ? 'En línea (Google Meet)' : 'Presencial'}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCreateAppointment}
                  disabled={loading || !newApptPatient || !newApptTime}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Cita'}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="font-medium">Selecciona una fecha</p>
                <p className="text-sm">para agendar una nueva cita</p>
              </div>
            )}
          </div>
        </div>
      ) : view === 'month' ? (
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

          <div className="card">
            {selectedDate ? (
              <>
                <h3 className="font-semibold text-lg mb-4">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {selectedAppts.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Sin citas este día</p>
                ) : (
                  <div className="space-y-3">
                    {selectedAppts.map(apt => (
                      <div key={apt.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-sm">{apt.patientName}</p>
                          <span className={`w-2 h-2 rounded-full ${statusColors[apt.status]}`}></span>
                        </div>
                        <p className="text-xs text-gray-500">{apt.startTime} - {apt.endTime}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-400 capitalize">
                            {apt.type === 'initial' ? 'Primera consulta' : apt.type === 'followup' ? 'Seguimiento' : 'Urgencia'}
                          </p>
                          <span className="text-xs text-gray-300">|</span>
                          <p className="text-xs text-gray-400">{apt.modality === 'online' ? 'En línea' : 'Presencial'}</p>
                        </div>
                        <p className={`text-xs mt-1 ${apt.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-500'}`}>
                          {apt.paymentStatus === 'paid' ? 'Pagada' : 'Pago pendiente'}
                        </p>
                        {apt.meetLink && (
                          <a href={apt.meetLink} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 transition-colors">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            Google Meet
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-sm">Selecciona un día para ver detalles</p>
              </div>
            )}
          </div>
        </div>
      ) : (
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
                  const hourAppts = getAppointmentsForDate(dateStr).filter(a => {
                    const h = parseInt(a.startTime.split(':')[0]);
                    return h === hour;
                  });
                  return (
                    <div key={`${dateStr}-${hour}`} className="border-l p-0.5">
                      {hourAppts.map(a => (
                        <div key={a.id} className={`text-[10px] p-1 rounded ${a.status === 'confirmed' ? 'bg-green-100 text-green-800' : a.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          <p className="font-medium truncate">{a.patientName}</p>
                          <p>{a.startTime} {a.modality === 'online' ? '(Meet)' : ''}</p>
                        </div>
                      ))}
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
