'use client';

import { useState, useEffect, useCallback } from 'react';
import { patients as patientsApi } from '@/lib/api';
import { Patient, PatientLog } from '@/types';

const SYMPTOMS = ['Ansiedad', 'Depresión', 'Insomnio', 'Irritabilidad', 'Fatiga', 'Falta de concentración', 'Aislamiento social', 'Cambios de apetito', 'Pensamientos intrusivos', 'Ataques de pánico'];

export default function BitacoraPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<PatientLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    mood: 5,
    symptoms: [] as string[],
    notes: '',
    treatment: '',
    progress: 'stable' as 'improving' | 'stable' | 'declining',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    patientsApi.list().then(setPatientList).catch(() => {});
  }, []);

  const loadLogs = useCallback(async (patientId: string) => {
    try {
      const data = await patientsApi.logs(patientId);
      setLogs(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (selectedPatient) loadLogs(selectedPatient.id);
  }, [selectedPatient, loadLogs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setLoading(true);
    try {
      await patientsApi.createLog({ patientId: selectedPatient.id, ...formData });
      setMessage({ type: 'success', text: 'Registro guardado exitosamente' });
      setShowForm(false);
      setFormData({ mood: 5, symptoms: [], notes: '', treatment: '', progress: 'stable' });
      loadLogs(selectedPatient.id);
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar registro' });
    } finally {
      setLoading(false);
    }
  };

  const toggleSymptom = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const progressColors: Record<string, string> = {
    improving: 'bg-green-100 text-green-800',
    stable: 'bg-blue-100 text-blue-800',
    declining: 'bg-red-100 text-red-800',
  };

  const progressLabels: Record<string, string> = {
    improving: 'Mejorando',
    stable: 'Estable',
    declining: 'Declinando',
  };

  const moodEmojis = ['😞', '😔', '😐', '🙂', '😊'];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bitácora de Pacientes</h1>
        <p className="text-gray-500 text-sm mt-1">Registro y seguimiento del progreso de tus pacientes</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient list */}
        <div className="card">
          <h2 className="font-semibold mb-4">Mis Pacientes</h2>
          {patientList.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No hay pacientes registrados aún. Los pacientes aparecerán aquí una vez agenden una cita.</p>
          ) : (
            <div className="space-y-2">
              {patientList.map(p => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setShowForm(false); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedPatient?.id === p.id ? 'bg-primary-50 ring-1 ring-primary-200' : 'hover:bg-gray-50'
                  }`}>
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-xs">
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Patient details & logs */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <>
              <div className="card mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedPatient.name}</h3>
                    <p className="text-sm text-gray-500">{selectedPatient.email} {selectedPatient.phone && `| ${selectedPatient.phone}`}</p>
                  </div>
                  <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
                    {showForm ? 'Ver Historial' : '+ Nuevo Registro'}
                  </button>
                </div>
              </div>

              {showForm ? (
                <div className="card">
                  <h3 className="font-semibold mb-4">Nuevo Registro de Bitácora</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="label-field">Estado de ánimo ({formData.mood}/10)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{moodEmojis[Math.min(Math.floor(formData.mood / 2.5), 4)]}</span>
                        <input type="range" min="1" max="10" value={formData.mood}
                          onChange={e => setFormData({ ...formData, mood: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600" />
                        <span className="text-sm font-medium w-8 text-center">{formData.mood}</span>
                      </div>
                    </div>

                    <div>
                      <label className="label-field">Síntomas observados</label>
                      <div className="flex flex-wrap gap-2">
                        {SYMPTOMS.map(s => (
                          <button key={s} type="button" onClick={() => toggleSymptom(s)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                              formData.symptoms.includes(s) ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="label-field">Notas de la sesión</label>
                      <textarea className="input-field h-24 resize-none" placeholder="Observaciones, comportamiento, temas discutidos..."
                        value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                    </div>

                    <div>
                      <label className="label-field">Tratamiento / Ajustes</label>
                      <textarea className="input-field h-20 resize-none" placeholder="Cambios en medicación, nuevas técnicas terapéuticas..."
                        value={formData.treatment} onChange={e => setFormData({ ...formData, treatment: e.target.value })} />
                    </div>

                    <div>
                      <label className="label-field">Progreso general</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['improving', 'stable', 'declining'] as const).map(p => (
                          <button key={p} type="button" onClick={() => setFormData({ ...formData, progress: p })}
                            className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                              formData.progress === p ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'
                            }`}>
                            {progressLabels[p]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary w-full">
                      {loading ? 'Guardando...' : 'Guardar Registro'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="card text-center py-8">
                      <p className="text-gray-400">No hay registros para este paciente</p>
                    </div>
                  ) : (
                    logs.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
                      <div key={log.id} className="card">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{moodEmojis[Math.min(Math.floor(log.mood / 2.5), 4)]}</span>
                            <div>
                              <p className="font-medium text-gray-900">Estado de ánimo: {log.mood}/10</p>
                              <p className="text-xs text-gray-400">{new Date(log.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${progressColors[log.progress]}`}>
                            {progressLabels[log.progress]}
                          </span>
                        </div>
                        {log.symptoms.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {log.symptoms.map(s => (
                              <span key={s} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{s}</span>
                            ))}
                          </div>
                        )}
                        {log.notes && <p className="text-sm text-gray-700 mb-2">{log.notes}</p>}
                        {log.treatment && (
                          <div className="bg-blue-50 rounded-lg p-3 text-sm">
                            <p className="font-medium text-blue-900 text-xs mb-1">Tratamiento:</p>
                            <p className="text-blue-800">{log.treatment}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="card text-center py-16 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <p className="font-medium">Selecciona un paciente</p>
              <p className="text-sm">para ver o agregar registros a su bitácora</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
