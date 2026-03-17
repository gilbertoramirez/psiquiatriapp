'use client';

import { useState, useEffect } from 'react';
import { patients as patientsApi, appointments as appointmentsApi } from '@/lib/api';
import { DashboardStats, Appointment } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) setUserName(JSON.parse(user).name);

    patientsApi.stats().then(setStats).catch(() => {});
    appointmentsApi.list().then((appts: Appointment[]) => {
      const today = new Date().toISOString().split('T')[0];
      setTodayAppts(appts.filter(a => a.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime)));
    }).catch(() => {});
  }, []);

  const statCards = stats ? [
    { label: 'Total Pacientes', value: stats.totalPatients, icon: '👥', color: 'bg-blue-50 text-blue-700' },
    { label: 'Citas Hoy', value: stats.todayAppointments, icon: '📅', color: 'bg-green-50 text-green-700' },
    { label: 'Citas Esta Semana', value: stats.weekAppointments, icon: '📊', color: 'bg-purple-50 text-purple-700' },
    { label: 'Pagos Pendientes', value: stats.pendingPayments, icon: '💰', color: 'bg-orange-50 text-orange-700' },
  ] : [];

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bienvenida, {userName}</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-2xl p-2 rounded-lg ${card.color}`}>{card.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Today's appointments */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Citas de Hoy</h2>
        {todayAppts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No hay citas programadas para hoy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayAppts.map(apt => (
              <div key={apt.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                    {apt.patientName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{apt.patientName}</p>
                    <p className="text-sm text-gray-500">{apt.startTime} - {apt.endTime} hrs</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status]}`}>
                    {apt.status === 'scheduled' ? 'Agendada' : apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'completed' ? 'Completada' : 'Cancelada'}
                  </span>
                  <span className={`text-xs ${apt.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                    {apt.paymentStatus === 'paid' ? 'Pagada' : 'Sin pago'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
