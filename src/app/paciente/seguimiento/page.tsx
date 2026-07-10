'use client';

import { useState, useEffect } from 'react';
import { checkIns as checkInsApi } from '@/lib/api';

interface CheckIn {
  id: string;
  date: string;
  mood: number;
  sleep: number;
  sleepQuality: number;
  anxiety: number;
  energy: number;
  sideEffects?: string;
  notes?: string;
}

const moodLabels = ['', 'Muy mal', 'Mal', 'Regular-', 'Regular', 'Neutral', 'Bien-', 'Bien', 'Muy bien', 'Excelente', 'Increíble'];
const sleepQualityLabels = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

export default function SeguimientoPage() {
  const [checkInsList, setCheckInsList] = useState<CheckIn[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [form, setForm] = useState({
    mood: 5,
    sleep: 7,
    sleepQuality: 3,
    anxiety: 3,
    energy: 5,
    sideEffects: '',
    notes: '',
  });

  useEffect(() => {
    checkInsApi.list()
      .then(setCheckInsList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = checkInsList.some(c => c.date === todayStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const newCheckIn = await checkInsApi.create(form);
      setCheckInsList(prev => [newCheckIn, ...prev]);
      setShowForm(false);
      setMessage({ type: 'success', text: 'Registro guardado. Tu doctora podrá ver tu evolución.' });
      setForm({ mood: 5, sleep: 7, sleepQuality: 3, anxiety: 3, energy: 5, sideEffects: '', notes: '' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally {
      setSubmitting(false);
    }
  };

  const moodColor = (v: number) => v <= 3 ? 'text-red-500' : v <= 5 ? 'text-yellow-500' : v <= 7 ? 'text-blue-500' : 'text-green-500';
  const anxietyColor = (v: number) => v <= 3 ? 'text-green-500' : v <= 5 ? 'text-yellow-500' : v <= 7 ? 'text-orange-500' : 'text-red-500';

  const weekData = checkInsList.slice(0, 7).reverse();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Seguimiento</h1>
          <p className="text-gray-500 text-sm mt-1">Registra cómo te sientes para que tu doctora pueda darte mejor atención</p>
        </div>
        {!hasCheckedInToday && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
            + Registro de Hoy
          </button>
        )}
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="card mb-6 border border-salmon-200">
          <h2 className="font-semibold text-lg mb-4">¿Cómo te sientes hoy?</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-field">Estado de ánimo: {form.mood}/10 — {moodLabels[form.mood]}</label>
              <input type="range" min="1" max="10" value={form.mood}
                onChange={e => setForm({ ...form, mood: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-salmon-400" />
              <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Muy mal</span><span>Increíble</span></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Horas de sueño: {form.sleep}h</label>
                <input type="range" min="0" max="14" step="0.5" value={form.sleep}
                  onChange={e => setForm({ ...form, sleep: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-400" />
              </div>
              <div>
                <label className="label-field">Calidad de sueño: {sleepQualityLabels[form.sleepQuality]}</label>
                <input type="range" min="1" max="5" value={form.sleepQuality}
                  onChange={e => setForm({ ...form, sleepQuality: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Nivel de ansiedad: {form.anxiety}/10</label>
                <input type="range" min="1" max="10" value={form.anxiety}
                  onChange={e => setForm({ ...form, anxiety: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-400" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Tranquilo</span><span>Muy ansioso</span></div>
              </div>
              <div>
                <label className="label-field">Nivel de energía: {form.energy}/10</label>
                <input type="range" min="1" max="10" value={form.energy}
                  onChange={e => setForm({ ...form, energy: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-400" />
                <div className="flex justify-between text-xs text-gray-400 mt-1"><span>Sin energía</span><span>Muy activo</span></div>
              </div>
            </div>

            <div>
              <label className="label-field">Efectos secundarios de medicamentos (opcional)</label>
              <input type="text" className="input-field" placeholder="Ej: Dolor de cabeza, náuseas, mareo..."
                value={form.sideEffects} onChange={e => setForm({ ...form, sideEffects: e.target.value })} />
            </div>

            <div>
              <label className="label-field">Notas adicionales (opcional)</label>
              <textarea className="input-field h-20 resize-none" placeholder="¿Algo que quieras compartir con tu doctora?"
                value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Guardando...' : 'Guardar Registro'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {hasCheckedInToday && !showForm && (
        <div className="card mb-6 bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-green-800 font-medium text-sm">Ya registraste tu seguimiento de hoy. Vuelve mañana.</p>
          </div>
        </div>
      )}

      {weekData.length > 1 && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-4">Evolución reciente</h3>
          <div className="grid grid-cols-4 gap-4 text-center text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-2">Ánimo</p>
              <div className="flex items-end justify-center gap-1 h-16">
                {weekData.map((c, i) => (
                  <div key={i} className="bg-salmon-200 rounded-t" style={{ width: 20, height: `${(c.mood / 10) * 100}%` }}
                    title={`${c.date}: ${c.mood}/10`} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-2">Sueño</p>
              <div className="flex items-end justify-center gap-1 h-16">
                {weekData.map((c, i) => (
                  <div key={i} className="bg-indigo-200 rounded-t" style={{ width: 20, height: `${(c.sleep / 14) * 100}%` }}
                    title={`${c.date}: ${c.sleep}h`} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-2">Ansiedad</p>
              <div className="flex items-end justify-center gap-1 h-16">
                {weekData.map((c, i) => (
                  <div key={i} className="bg-orange-200 rounded-t" style={{ width: 20, height: `${(c.anxiety / 10) * 100}%` }}
                    title={`${c.date}: ${c.anxiety}/10`} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-2">Energía</p>
              <div className="flex items-end justify-center gap-1 h-16">
                {weekData.map((c, i) => (
                  <div key={i} className="bg-green-200 rounded-t" style={{ width: 20, height: `${(c.energy / 10) * 100}%` }}
                    title={`${c.date}: ${c.energy}/10`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Historial</h3>
        {loading ? (
          <div className="card text-center py-8"><div className="animate-spin w-6 h-6 border-4 border-salmon-400 border-t-transparent rounded-full mx-auto"></div></div>
        ) : checkInsList.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <p className="font-medium">Sin registros aún</p>
            <p className="text-sm">Empieza registrando cómo te sientes hoy</p>
          </div>
        ) : (
          checkInsList.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-gray-900">
                  {new Date(c.date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-gray-500">Ánimo</p>
                  <p className={`font-bold text-lg ${moodColor(c.mood)}`}>{c.mood}/10</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-gray-500">Sueño</p>
                  <p className="font-bold text-lg text-indigo-500">{c.sleep}h</p>
                  <p className="text-xs text-gray-400">{sleepQualityLabels[c.sleepQuality]}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-gray-500">Ansiedad</p>
                  <p className={`font-bold text-lg ${anxietyColor(c.anxiety)}`}>{c.anxiety}/10</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                  <p className="text-xs text-gray-500">Energía</p>
                  <p className={`font-bold text-lg ${moodColor(c.energy)}`}>{c.energy}/10</p>
                </div>
              </div>
              {c.sideEffects && (
                <div className="mt-3 bg-orange-50 rounded-lg p-2.5 text-sm">
                  <span className="font-medium text-orange-800 text-xs">Efectos secundarios: </span>
                  <span className="text-orange-700">{c.sideEffects}</span>
                </div>
              )}
              {c.notes && <p className="mt-2 text-sm text-gray-600">{c.notes}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
