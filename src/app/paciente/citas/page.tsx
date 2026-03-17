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

// Doctor available hours (matching the default doctor)
const DOCTOR_HOURS: Record<string, { start: string; end: string }[]> = {
  monday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
  tuesday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
  wednesday: [{ start: '09:00', end: '14:00' }],
  thursday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
  friday: [{ start: '09:00', end: '14:00' }],
};

const dayNames: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
  4: 'thursday', 5: 'friday', 6: 'saturday',
};

function generateTimeSlots(date: Date, existingAppointments: Appointment[]): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const dayName = dayNames[dayOfWeek];
  const slots = DOCTOR_HOURS[dayName];
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
      current += 60; // 1 hour slots
    }
  });

  return timeSlots;
}

export default function CitasPage() {
  const [myAppointments, setMyAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [appointmentType, setAppointmentType] = useState<string>('followup');
  const [showBooking, setShowBooking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadAppointments = useCallback(async () => {
    try {
      const data = await appointmentsApi.list();
      setMyAppointments(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  useEffect(() => {
    if (selectedDate) {
      const slots = generateTimeSlots(selectedDate, myAppointments);
      setTimeSlots(slots);
      setSelectedTime(null);
    }
  }, [selectedDate, myAppointments]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await appointmentsApi.create({
        doctorId: 'doc-1',
        date: selectedDate.toISOString().split('T')[0],
        startTime: selectedTime,
        type: appointmentType,
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
    const date = new Date(year, month, day);
    if (date < today) return false;
    const dayName = dayNames[date.getDay()];
    return !!DOCTOR_HOURS[dayName];
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
                      isSelected ? 'bg-primary-600 text-white font-bold shadow-md' :
                      isToday ? 'bg-primary-50 text-primary-700 font-semibold' :
                      available ? 'hover:bg-primary-50 text-gray-700 cursor-pointer' :
                      'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {day}
                    {hasAppt && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-accent-500 rounded-full"></div>}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary-100 border border-primary-300"></div> Hoy</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-primary-600"></div> Seleccionado</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-500"></div> Con cita</div>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
              <p className="font-medium mb-1">Horarios de atención:</p>
              {Object.entries(DOCTOR_HOURS).map(([day, slots]) => (
                <p key={day}>{DAYS_ES[day]}: {slots.map(s => `${s.start} - ${s.end}`).join(', ')}</p>
              ))}
            </div>
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
                        selectedTime === slot.time ? 'bg-primary-600 text-white shadow-md' :
                        slot.available ? 'bg-gray-100 text-gray-700 hover:bg-primary-50 hover:text-primary-700' :
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

                    <div className="bg-primary-50 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-primary-900">Dra. María García López</p>
                          <p className="text-sm text-primary-700">{selectedTime} hrs - {DAY_NAMES[selectedDate.getDay()]} {selectedDate.getDate()}/{selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}</p>
                        </div>
                        <p className="text-xl font-bold text-primary-700">$1,500</p>
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
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{apt.doctorName}</p>
                    <p className="text-sm text-gray-500">{apt.date} a las {apt.startTime} hrs</p>
                    <p className="text-xs text-gray-400 capitalize">{apt.type === 'initial' ? 'Primera consulta' : apt.type === 'followup' ? 'Seguimiento' : 'Urgencia'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                    {statusLabels[apt.status]}
                  </span>
                  <p className={`text-xs mt-1 ${apt.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                    {apt.paymentStatus === 'paid' ? 'Pagada' : 'Pago pendiente'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
