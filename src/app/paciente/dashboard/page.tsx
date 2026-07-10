'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { appointments, checkIns, prescriptions, recommendations, notifications, questionnaires } from '@/lib/api';

interface DashboardData {
  nextAppointment: Record<string, string> | null;
  streak: number;
  latestPrescription: Record<string, string> | null;
  activeRecommendations: number;
  recentNotifications: Record<string, string>[];
  latestPHQ9: number | null;
  latestGAD7: number | null;
}

function calculateStreak(checkinList: Record<string, string>[]): number {
  if (!checkinList.length) return 0;
  const dates = checkinList
    .map(c => new Date(c.createdAt || c.date).toISOString().split('T')[0])
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b.localeCompare(a));

  let streak = 0;
  const today = new Date();
  const check = new Date(today.toISOString().split('T')[0]);

  for (const dateStr of dates) {
    const diff = Math.round((check.getTime() - new Date(dateStr).getTime()) / 86400000);
    if (diff === streak) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export default function PatientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [appts, checks, rxList, recos, notifs, quests] = await Promise.all([
          appointments.list().catch(() => []),
          checkIns.list().catch(() => []),
          prescriptions.list().catch(() => []),
          recommendations.list().catch(() => []),
          notifications.list().catch(() => []),
          questionnaires.list().catch(() => []),
        ]);

        const apptArray = Array.isArray(appts) ? appts : appts?.appointments || [];
        const now = new Date();
        const upcoming = apptArray
          .filter((a: Record<string, string>) => new Date(a.date || a.scheduledAt) > now && a.status !== 'cancelled')
          .sort((a: Record<string, string>, b: Record<string, string>) => new Date(a.date || a.scheduledAt).getTime() - new Date(b.date || b.scheduledAt).getTime());

        const checkinArray = Array.isArray(checks) ? checks : checks?.checkIns || [];
        const rxArray = Array.isArray(rxList) ? rxList : rxList?.prescriptions || [];
        const recoArray = Array.isArray(recos) ? recos : recos?.recommendations || [];
        const notifArray = Array.isArray(notifs) ? notifs : notifs?.notifications || [];
        const questArray = Array.isArray(quests) ? quests : quests?.questionnaires || [];

        const activeRecos = recoArray.filter((r: Record<string, string>) => r.status === 'active' || !r.completedAt).length;
        const unread = notifArray.filter((n: Record<string, string>) => !n.read && !n.readAt).slice(0, 3);

        const phq9 = questArray.filter((q: Record<string, string>) => q.type === 'PHQ-9' || q.type === 'phq9').sort((a: Record<string, string>, b: Record<string, string>) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const gad7 = questArray.filter((q: Record<string, string>) => q.type === 'GAD-7' || q.type === 'gad7').sort((a: Record<string, string>, b: Record<string, string>) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

        setData({
          nextAppointment: upcoming[0] || null,
          streak: calculateStreak(checkinArray),
          latestPrescription: rxArray.sort((a: Record<string, string>, b: Record<string, string>) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null,
          activeRecommendations: activeRecos,
          recentNotifications: unread,
          latestPHQ9: phq9?.score ?? null,
          latestGAD7: gad7?.score ?? null,
        });
      } catch {
        setData({
          nextAppointment: null,
          streak: 0,
          latestPrescription: null,
          activeRecommendations: 0,
          recentNotifications: [],
          latestPHQ9: null,
          latestGAD7: null,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-salmon-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mi Panel</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="card dark:bg-gray-800 dark:border-gray-700 md:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-salmon-100 dark:bg-salmon-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-salmon-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Proxima cita</h2>
          </div>
          {data.nextAppointment ? (
            <div className="space-y-2">
              <p className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">{new Date(data.nextAppointment.date || data.nextAppointment.scheduledAt).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                {' a las '}
                <span className="font-medium">{new Date(data.nextAppointment.date || data.nextAppointment.scheduledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
              {data.nextAppointment.modality && <p className="text-sm text-gray-500 dark:text-gray-400">Modalidad: {data.nextAppointment.modality}</p>}
              {data.nextAppointment.doctorName && <p className="text-sm text-gray-500 dark:text-gray-400">Doctor: {data.nextAppointment.doctorName}</p>}
              <p className="text-sm">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${data.nextAppointment.paymentStatus === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                  {data.nextAppointment.paymentStatus === 'paid' ? 'Pagada' : 'Pendiente de pago'}
                </span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 dark:text-gray-400 mb-3">No tienes citas programadas</p>
              <Link href="/paciente/citas" className="btn-primary text-sm inline-block">Agendar cita</Link>
            </div>
          )}
        </div>

        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Racha</h2>
          </div>
          <p className="text-4xl font-bold text-salmon-500">{data.streak}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {data.streak === 0 ? 'Comienza tu seguimiento hoy' : data.streak === 1 ? '1 dia consecutivo' : `${data.streak} dias consecutivos`}
          </p>
          <Link href="/paciente/seguimiento" className="text-sm text-salmon-500 hover:text-salmon-600 font-medium mt-3 inline-block">Ver seguimiento &rarr;</Link>
        </div>

        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Ultima receta</h2>
          </div>
          {data.latestPrescription ? (
            <div className="space-y-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(data.latestPrescription.createdAt).toLocaleDateString('es-MX')}</p>
              {data.latestPrescription.diagnosis && <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{data.latestPrescription.diagnosis}</p>}
              {data.latestPrescription.medications && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {Array.isArray(data.latestPrescription.medications)
                    ? (data.latestPrescription.medications as unknown as Record<string, string>[]).map(m => m.name || m.medication).join(', ')
                    : data.latestPrescription.medications}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Sin recetas</p>
          )}
          <Link href="/paciente/recetas" className="text-sm text-salmon-500 hover:text-salmon-600 font-medium mt-3 inline-block">Ver recetas &rarr;</Link>
        </div>

        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recomendaciones</h2>
          </div>
          <p className="text-4xl font-bold text-green-500">{data.activeRecommendations}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">activas</p>
          <Link href="/paciente/recomendaciones" className="text-sm text-salmon-500 hover:text-salmon-600 font-medium mt-3 inline-block">Ver todas &rarr;</Link>
        </div>

        <div className="card dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cuestionarios</h2>
          </div>
          <div className="space-y-2">
            <Link href="/paciente/cuestionarios" className="flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">PHQ-9</span>
              {data.latestPHQ9 !== null ? <span className="text-xs bg-salmon-100 dark:bg-salmon-900/30 text-salmon-700 dark:text-salmon-400 px-2 py-0.5 rounded-full font-medium">{data.latestPHQ9} pts</span> : <span className="text-xs text-gray-400">Sin resultado</span>}
            </Link>
            <Link href="/paciente/cuestionarios" className="flex items-center justify-between text-sm hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg px-2 py-1.5 -mx-2 transition-colors">
              <span className="text-gray-700 dark:text-gray-300">GAD-7</span>
              {data.latestGAD7 !== null ? <span className="text-xs bg-salmon-100 dark:bg-salmon-900/30 text-salmon-700 dark:text-salmon-400 px-2 py-0.5 rounded-full font-medium">{data.latestGAD7} pts</span> : <span className="text-xs text-gray-400">Sin resultado</span>}
            </Link>
          </div>
          <Link href="/paciente/cuestionarios" className="text-sm text-salmon-500 hover:text-salmon-600 font-medium mt-3 inline-block">Responder &rarr;</Link>
        </div>

        {data.recentNotifications.length > 0 && (
          <div className="card dark:bg-gray-800 dark:border-gray-700 md:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notificaciones recientes</h2>
            </div>
            <div className="space-y-2">
              {data.recentNotifications.map((n, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="w-2 h-2 bg-salmon-400 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{n.message || n.title}</p>
                    {n.createdAt && <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString('es-MX')}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
