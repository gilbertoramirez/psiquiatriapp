'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointments as appointmentsApi } from '@/lib/api';
import { Appointment, TimeSlot } from '@/types';

const DAYS_ES: Record<string, string> = {
  sunday: 'Domingo', monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado',
};

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MODALITY_LABELS: Record<string, string> = {
  both: 'Presencial y en línea',
  online: 'Únicamente en línea',
  presencial: 'Únicamente presencial',
};

const dayNames: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

interface DoctorInfo {
  id: string;
  name: string;
  specialty: string;
  consultationFee: number;
  availableHours: Record<string, { start: string; end: string }[]>;
  modalityByDay: Record<string, string> | null;
  address: string | null;
}

function generateTimeSlots(date: Date, existingAppointments: Appointment[], doctorHours: Record<string, { start: string; end: string }[]>): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const dayName = dayNames[dayOfWeek];
  const slots = doctorHours[dayName];
  if (!slots) return [];

  const dateStr = date.toISOString().split('T')[0];
  const bookedTimes = existingAppointments
    .filter(a => a.date === dateStr && a.status !== 'cancelled')
    .map(a => a.startTime);

  const timeSlots: TimeSlot[] = [];
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

export default function CitasPage() {
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<string>('followup');
  const [appointmentModality, setAppointmentModality] = useState<string>('in-person');
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadAppointments = useCallback(async () => {
    try {
      const data = await appointmentsApi.list();
      setMyAppointments(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadAppointments();
    fetch('/api/doctors')
      .then(r => r.json())
      .then((docs: DoctorInfo[]) => { if (docs.length > 0) setDoctor(docs[0]); })
      .catch(() => {});
  }, [loadAppointments]);

  useEffect(() => {
    if (selectedDate && doctor) {
      const slots = generateTimeSlots(selectedDate, myAppointments, doctor.availableHours);
      setTimeSlots(slots);
      setSelectedTime(null);
      const dayMod = doctor.modalityByDay?.[dayNames[selectedDate.getDay()]];
      if (dayMod === 'online') setAppointmentModality('online');
      else if (dayMod === 'in-person' || dayMod === 'presencial') setAppointmentModality('in-person');
    }
  }, [selectedDate, myAppointments, doctor]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !doctor) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await appointmentsApi.create({
        doctorId: doctor.id,
        date: selectedDate.toISOString().split('T')[0],
        startTime: selectedTime,
        type: appointmentType,
        modality: appointmentModality,
      });
      setMessage({ type: 'success', text: '¡Cita agendada exitosamente! Procede al pago para confirmar.' });
      setSelectedDate(null);
      setSelectedTime(null);
      setShowBooking(false);
      loadAppointments();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al agendar cita' });
    } finally {
      setLoading(false);
    }
  };

  // Calendar rendering
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const isAvailableDay = (day: number) => {
    if (!doctor) return false;
    const date = new Date(year, month, day);
    if (date < today) return false;
    const dn = dayNames[date.getDay()];
    return !!doctor.availableHours[dn];
  };

  const hasAppointment = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    return myAppointments.some(a => a.date === dateStr && a.status !== 'cancelled');
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusLabels: Record<string, string> = {
    scheduled: 'Agendada',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Citas</h1>
          <p className="text-gray-500 text-sm mt-1">Agenda y gestiona tus citas psiquiátricas</p>
        </div>
        <button onClick={() => setShowBooking(!showBooking)} className="btn-primary">
          {showBooking ? 'Ver Mis Citas' : '+ Nueva Cita'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {showBooking ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div className="card">
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
                if (!day) return <div key={`empty-${i}`} />;
                const available = isAvailableDay(day);
                const hasAppt = hasAppointment(day);
                const isSelected = selectedDate && selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

                return (
                  <button
                    key={day}
                    disabled={!available}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`relative p-2 text-sm rounded-lg transition-all ${
                      isSelected ? 'bg-salmon-400 text-white font-bold shadow-md' :
                      isToday ? 'bg-salmon-50 text-salmon-700 font-semibold' :
                      available ? 'hover:bg-salmon-50 text-gray-700 cursor-pointer' :
                      'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {day}
                    {hasAppt && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary-500 rounded-full"></div>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-salmon-100 border border-salmon-300"></div> Hoy</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-salmon-400"></div> Seleccionado</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-500"></div> Con cita</div>
            </div>

            {doctor && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-2">
              <div>
                <p className="font-medium mb-1">Horarios de atención:</p>
                {Object.entries(doctor.availableHours).map(([day, slots]) => (
                  <p key={day}>{DAYS_ES[day]}: {(slots as { start: string; end: string }[]).map(s => `${s.start} - ${s.end}`).join(', ')}
                    {doctor.modalityByDay?.[day] && <span className="italic"> — {MODALITY_LABELS[doctor.modalityByDay[day]] || doctor.modalityByDay[day]}</span>}
                  </p>
                ))}
              </div>
              <div>
                <p className="font-medium mb-1">Modalidades:</p>
                {doctor.address && <p>Presencial: {doctor.address}</p>}
                <p>En línea: Se envía enlace de videollamada por Google Meet</p>
              </div>
              <div>
                <p className="font-medium mb-1">Costo: ${doctor.consultationFee.toLocaleString()} MXN</p>
                <p>Pago por transferencia, efectivo o tarjeta</p>
              </div>
              <div>
                <p className="font-medium mb-1">Políticas de cita:</p>
                <p>• La cita se confirma 24 horas antes</p>
                <p>• No se solicita anticipo</p>
                <p>• Cancelación con menos de 24 horas: pago del 50% de la consulta</p>
                <p>• Inasistencia: pago total de la consulta</p>
              </div>
            </div>
            )}
          </div>

          {/* Time slots & booking */}
          <div className="card">
            {selectedDate ? (
              <>
                <h3 className="font-semibold text-lg mb-1">
                  {DAY_NAMES[selectedDate.getDay()]} {selectedDate.getDate()} de {MONTH_NAMES[selectedDate.getMonth()]}
                </h3>
                <p className="text-gray-500 text-sm mb-4">Selecciona un horario disponible</p>

                <div className="grid grid-cols-3 gap-2 mb-6">
                  {timeSlots.map(slot => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                        selectedTime === slot.time ? 'bg-salmon-400 text-white shadow-md' :
                        slot.available ? 'bg-gray-100 text-gray-700 hover:bg-salmon-50 hover:text-salmon-700' :
                        'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                  {timeSlots.length === 0 && (
                    <p className="col-span-3 text-gray-400 text-center py-8">No hay horarios disponibles este día</p>
                  )}
                </div>

                {selectedTime && (
                  <div className="border-t pt-4">
                    <div className="mb-4">
                      <label className="label-field">Tipo de consulta</label>
                      <select value={appointmentType} onChange={e => setAppointmentType(e.target.value)} className="input-field">
                        <option value="initial">Primera consulta</option>
                        <option value="followup">Seguimiento</option>
                        <option value="emergency">Urgencia</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="label-field">Modalidad</label>
                      {(() => {
                        const dayMod = doctor?.modalityByDay?.[dayNames[selectedDate.getDay()]];
                        if (dayMod === 'online') return <div className="input-field bg-gray-50 text-gray-600">En línea (Google Meet)</div>;
                        if (dayMod === 'in-person' || dayMod === 'presencial') return <div className="input-field bg-gray-50 text-gray-600">Presencial</div>;
                        return (
                          <select value={appointmentModality} onChange={e => setAppointmentModality(e.target.value)} className="input-field">
                            <option value="in-person">Presencial</option>
                            <option value="online">En línea (Google Meet)</option>
                          </select>
                        );
                      })()}
                    </div>

                    <div className="bg-salmon-50 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{doctor?.name}</p>
                          <p className="text-sm text-salmon-700">{selectedTime} hrs - {DAY_NAMES[selectedDate.getDay()]} {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}</p>
                          <p className="text-xs text-gray-500 mt-1">{appointmentModality === 'online' ? 'En línea (Google Meet)' : 'Presencial'}</p>
                        </div>
                        <p className="text-xl font-bold text-salmon-700">${doctor?.consultationFee.toLocaleString()}</p>
                      </div>
                    </div>

                    <button onClick={handleBook} disabled={loading} className="btn-primary w-full">
                      {loading ? 'Agendando...' : 'Confirmar Cita'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="font-medium">Selecciona una fecha</p>
                <p className="text-sm">en el calendario para ver horarios disponibles</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Appointment list */
        <div className="space-y-3">
          {myAppointments.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-gray-500 font-medium">No tienes citas agendadas</p>
              <p className="text-gray-400 text-sm mt-1">Agenda tu primera cita con el botón &quot;+ Nueva Cita&quot;</p>
            </div>
          ) : (
            myAppointments.sort((a, b) => b.date.localeCompare(a.date)).map(apt => (
              <div key={apt.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-salmon-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-salmon-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{apt.doctorName}</p>
                    <p className="text-sm text-gray-500">{apt.date} a las {apt.startTime} hrs</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">{apt.type === 'initial' ? 'Primera consulta' : apt.type === 'followup' ? 'Seguimiento' : 'Urgencia'}</p>
                      <span className="text-xs text-gray-300">|</span>
                      <p className="text-xs text-gray-400">{apt.modality === 'online' ? 'En línea' : 'Presencial'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                    {statusLabels[apt.status]}
                  </span>
                  <p className={`text-xs ${apt.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                    {apt.paymentStatus === 'paid' ? 'Pagada' : 'Pago pendiente'}
                  </p>
                  {apt.meetLink && apt.paymentStatus === 'paid' && (
                    <a href={apt.meetLink} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Google Meet
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
