'use client';

import { useState, useEffect, useCallback } from 'react';
import { appointments as appointmentsApi } from '@/lib/api';
import { Appointment } from '@/types';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function CalendarioPage() {
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [view, setView] = useState<'month' | 'week'>('month');

  const loadAppointments = useCallback(async () => {
    try {
      const data = await appointmentsApi.list();
      setAllAppointments(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

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

  // Week view
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
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am to 7pm

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendario de Citas</h1>
          <p className="text-gray-500 text-sm mt-1">Vista general de todas tus citas</p>
        </div>
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'month' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Mes</button>
          <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-md text-sm font-medium ${view === 'week' ? 'bg-white shadow-sm' : 'text-gray-500'}`}>Semana</button>
        </div>
      </div>

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
                      isSelected ? 'bg-primary-50 ring-2 ring-primary-500' :
                      isToday ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}>
                    <span className={`text-sm ${isToday ? 'font-bold text-primary-600' : 'text-gray-700'}`}>{day}</span>
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

          {/* Selected date details */}
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
                <p className="text-sm">Selecciona un día para ver detalles</p>
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
                  <div key={dateStr} className={`p-2 text-center border-l ${isToday ? 'bg-primary-50' : ''}`}>
                    <p className="text-xs text-gray-500">{DAY_NAMES[d.getDay()].slice(0, 3)}</p>
                    <p className={`text-lg font-semibold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>{d.getDate()}</p>
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
                          <p>{a.startTime}</p>
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
