'use client';

import { useState, useEffect, useCallback } from 'react';
import { patients as patientsApi } from '@/lib/api';
import { Patient, PatientLog, DiagnosticoCIE10, IndicacionMedica, SignosVitales } from '@/types';

const SYMPTOMS = ['Ansiedad', 'Depresión', 'Insomnio', 'Irritabilidad', 'Fatiga', 'Falta de concentración', 'Aislamiento social', 'Cambios de apetito', 'Pensamientos intrusivos', 'Ataques de pánico'];

const VIA_OPTIONS = ['oral', 'sublingual', 'intramuscular', 'intravenosa', 'topica', 'otra'] as const;

const emptyForm = () => ({
  motivoConsulta: '',
  evolucionClinica: '',
  exploracionFisica: '',
  mood: 5,
  symptoms: [] as string[],
  examenMental: '',
  riesgoSuicida: 'nulo' as 'nulo' | 'bajo' | 'moderado' | 'alto',
  riesgoViolencia: 'nulo' as 'nulo' | 'bajo' | 'moderado' | 'alto',
  consumoSustancias: '',
  signosVitales: {} as SignosVitales,
  resultadosEstudios: '',
  diagnosticos: [] as DiagnosticoCIE10[],
  pronostico: 'reservado' as 'favorable' | 'reservado' | 'desfavorable',
  progress: 'stable' as 'improving' | 'stable' | 'declining',
  indicaciones: [] as IndicacionMedica[],
  treatment: '',
  proximaCita: '',
});

const progressLabels: Record<string, string> = { improving: 'Mejorando', stable: 'Estable', declining: 'Declinando' };
const progressColors: Record<string, string> = { improving: 'bg-green-100 text-green-800', stable: 'bg-blue-100 text-blue-800', declining: 'bg-red-100 text-red-800' };
const riesgoColors: Record<string, string> = { nulo: 'bg-gray-100 text-gray-600', bajo: 'bg-yellow-100 text-yellow-700', moderado: 'bg-orange-100 text-orange-700', alto: 'bg-red-100 text-red-700' };
const moodEmojis = ['😞', '😔', '😐', '🙂', '😊'];

export default function BitacoraPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [logs, setLogs] = useState<PatientLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [addendumLog, setAddendumLog] = useState<string | null>(null);
  const [addendumText, setAddendumText] = useState('');
  const [formData, setFormData] = useState(emptyForm());
  const [newDiag, setNewDiag] = useState<DiagnosticoCIE10>({ codigo: '', descripcion: '', tipo: 'principal' });
  const [newMed, setNewMed] = useState<IndicacionMedica>({ medicamento: '', dosis: '', via: 'oral', frecuencia: '', duracion: '', instrucciones: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => { patientsApi.list().then(setPatientList).catch(() => {}); }, []);

  const loadLogs = useCallback(async (patientId: string) => {
    try { setLogs(await patientsApi.logs(patientId)); } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (selectedPatient) loadLogs(selectedPatient.id); }, [selectedPatient, loadLogs]);

  const set = (field: string, value: unknown) => setFormData(prev => ({ ...prev, [field]: value }));
  const setVital = (field: string, value: string) => setFormData(prev => ({
    ...prev,
    signosVitales: { ...prev.signosVitales, [field]: value === '' ? undefined : Number(value) },
  }));

  const addDiagnostico = () => {
    if (!newDiag.codigo || !newDiag.descripcion) return;
    set('diagnosticos', [...formData.diagnosticos, newDiag]);
    setNewDiag({ codigo: '', descripcion: '', tipo: 'principal' });
  };

  const addIndicacion = () => {
    if (!newMed.medicamento || !newMed.dosis) return;
    set('indicaciones', [...formData.indicaciones, newMed]);
    setNewMed({ medicamento: '', dosis: '', via: 'oral', frecuencia: '', duracion: '', instrucciones: '' });
  };

  const toggleSymptom = (s: string) => set('symptoms', formData.symptoms.includes(s) ? formData.symptoms.filter(x => x !== s) : [...formData.symptoms, s]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await patientsApi.createLog({ patientId: selectedPatient.id, ...formData });
      setMessage({ type: 'success', text: 'Nota de evolución guardada y firmada digitalmente (NOM-024)' });
      setShowForm(false);
      setFormData(emptyForm());
      loadLogs(selectedPatient.id);
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar registro' });
    } finally { setLoading(false); }
  };

  const handleAddendum = async (logId: string) => {
    if (!addendumText.trim()) return;
    try {
      await patientsApi.addAddendum(logId, addendumText);
      setAddendumLog(null);
      setAddendumText('');
      if (selectedPatient) loadLogs(selectedPatient.id);
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expediente Clínico Electrónico</h1>
        <p className="text-gray-500 text-sm mt-1">Notas de evolución · NOM-004-SSA3-2012 · NOM-024-SSA3-2012</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Patient list */}
        <div className="card h-fit">
          <h2 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wide">Pacientes</h2>
          {patientList.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Los pacientes aparecerán una vez agenden una cita.</p>
          ) : (
            <div className="space-y-1">
              {patientList.map(p => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setShowForm(false); }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${selectedPatient?.id === p.id ? 'bg-salmon-50 ring-1 ring-salmon-200' : 'hover:bg-gray-50'}`}>
                  <div className="w-8 h-8 bg-salmon-100 rounded-full flex items-center justify-center text-salmon-700 font-bold text-xs flex-shrink-0">
                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400 truncate">{p.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <>
              <div className="card mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedPatient.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{logs.length} nota(s) de evolución</p>
                </div>
                <button onClick={() => { setShowForm(!showForm); setMessage({ type: '', text: '' }); }} className="btn-primary text-sm">
                  {showForm ? 'Ver Historial' : '+ Nueva Nota'}
                </button>
              </div>

              {showForm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Encabezado NOM-004 */}
                  <div className="card">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identificación del paciente</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-500">Paciente:</span> <span className="font-medium">{selectedPatient.name}</span></div>
                      <div><span className="text-gray-500">Médico:</span> <span className="font-medium">Dra. María García López</span></div>
                      <div><span className="text-gray-500">Fecha:</span> <span className="font-medium">{new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
                      <div><span className="text-gray-500">Cédula:</span> <span className="font-medium">PSQ-2024-001</span></div>
                    </div>
                  </div>

                  {/* 6.2.1 Evolución del cuadro clínico */}
                  <div className="card space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">§ 6.2.1 — Evolución del cuadro clínico <span className="text-red-400">*</span></p>
                    <div>
                      <label className="label-field">Motivo de consulta</label>
                      <input className="input-field" placeholder="Motivo principal de la consulta"
                        value={formData.motivoConsulta} onChange={e => set('motivoConsulta', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-field">Evolución clínica <span className="text-red-400">*</span></label>
                      <textarea className="input-field h-24 resize-none" required
                        placeholder="Evolución y actualización del cuadro clínico (incluir abuso de sustancias psicoactivas si aplica)..."
                        value={formData.evolucionClinica} onChange={e => set('evolucionClinica', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-field">Exploración física / Examen del estado mental</label>
                      <textarea className="input-field h-20 resize-none"
                        placeholder="Habitus exterior, estado mental, hallazgos relevantes..."
                        value={formData.exploracionFisica} onChange={e => set('exploracionFisica', e.target.value)} />
                    </div>
                  </div>

                  {/* Evaluación psiquiátrica */}
                  <div className="card space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Evaluación psiquiátrica</p>

                    <div>
                      <label className="label-field">Estado de ánimo ({formData.mood}/10)</label>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{moodEmojis[Math.min(Math.floor(formData.mood / 2.5), 4)]}</span>
                        <input type="range" min="1" max="10" value={formData.mood}
                          onChange={e => set('mood', parseInt(e.target.value))}
                          className="flex-1 accent-salmon-400" />
                        <span className="text-sm font-medium w-6">{formData.mood}</span>
                      </div>
                    </div>

                    <div>
                      <label className="label-field">Síntomas observados</label>
                      <div className="flex flex-wrap gap-1.5">
                        {SYMPTOMS.map(s => (
                          <button key={s} type="button" onClick={() => toggleSymptom(s)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${formData.symptoms.includes(s) ? 'bg-salmon-100 text-salmon-700 ring-1 ring-salmon-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label-field">Riesgo suicida</label>
                        <div className="flex gap-1">
                          {(['nulo', 'bajo', 'moderado', 'alto'] as const).map(r => (
                            <button key={r} type="button" onClick={() => set('riesgoSuicida', r)}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors capitalize ${formData.riesgoSuicida === r ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-500'}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label-field">Riesgo de violencia</label>
                        <div className="flex gap-1">
                          {(['nulo', 'bajo', 'moderado', 'alto'] as const).map(r => (
                            <button key={r} type="button" onClick={() => set('riesgoViolencia', r)}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors capitalize ${formData.riesgoViolencia === r ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-500'}`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="label-field">Consumo de sustancias psicoactivas</label>
                      <input className="input-field" placeholder="Tabaco, alcohol, otras sustancias (NOM-004 6.2.1)"
                        value={formData.consumoSustancias} onChange={e => set('consumoSustancias', e.target.value)} />
                    </div>
                  </div>

                  {/* 6.2.2 Signos vitales */}
                  <div className="card space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">§ 6.2.2 — Signos vitales</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'tensionArterial', label: 'T/A', placeholder: '120/80', isText: true },
                        { key: 'frecuenciaCardiaca', label: 'FC (lpm)', placeholder: '72' },
                        { key: 'frecuenciaRespiratoria', label: 'FR (rpm)', placeholder: '16' },
                        { key: 'temperatura', label: 'Temp (°C)', placeholder: '36.5' },
                        { key: 'peso', label: 'Peso (kg)', placeholder: '70' },
                        { key: 'talla', label: 'Talla (cm)', placeholder: '170' },
                        { key: 'oximetria', label: 'SpO₂ (%)', placeholder: '98' },
                      ].map(({ key, label, placeholder, isText }) => (
                        <div key={key}>
                          <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                          {isText ? (
                            <input className="input-field text-sm py-1.5" placeholder={placeholder}
                              value={(formData.signosVitales as Record<string, unknown>)[key] as string || ''}
                              onChange={e => setFormData(prev => ({ ...prev, signosVitales: { ...prev.signosVitales, [key]: e.target.value } }))} />
                          ) : (
                            <input type="number" className="input-field text-sm py-1.5" placeholder={placeholder}
                              onChange={e => setVital(key, e.target.value)} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6.2.3 Estudios auxiliares */}
                  <div className="card">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">§ 6.2.3 — Resultados de estudios auxiliares</p>
                    <textarea className="input-field h-16 resize-none" placeholder="Resultados relevantes de laboratorio, gabinete u otros estudios previamente solicitados..."
                      value={formData.resultadosEstudios} onChange={e => set('resultadosEstudios', e.target.value)} />
                  </div>

                  {/* Diagnóstico CIE-10 */}
                  <div className="card space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">§ 6.2.4 — Diagnósticos CIE-10 <span className="text-red-400">*</span></p>
                    {formData.diagnosticos.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded p-2 text-sm">
                        <span className="font-mono font-medium text-salmon-700">{d.codigo}</span>
                        <span className="flex-1 text-gray-700">{d.descripcion}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${d.tipo === 'principal' ? 'bg-salmon-100 text-salmon-700' : 'bg-gray-100 text-gray-500'}`}>{d.tipo}</span>
                        <button type="button" onClick={() => set('diagnosticos', formData.diagnosticos.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2">
                      <input className="input-field text-sm font-mono" placeholder="Código CIE-10 (ej. F32.1)"
                        value={newDiag.codigo} onChange={e => setNewDiag({ ...newDiag, codigo: e.target.value.toUpperCase() })} />
                      <input className="input-field text-sm col-span-2 - col-span-1" placeholder="Descripción del diagnóstico"
                        value={newDiag.descripcion} onChange={e => setNewDiag({ ...newDiag, descripcion: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <select className="input-field text-sm flex-1" value={newDiag.tipo}
                        onChange={e => setNewDiag({ ...newDiag, tipo: e.target.value as 'principal' | 'secundario' })}>
                        <option value="principal">Principal</option>
                        <option value="secundario">Secundario</option>
                      </select>
                      <button type="button" onClick={addDiagnostico} className="btn-primary text-sm px-4">Agregar</button>
                    </div>
                    {formData.diagnosticos.length === 0 && (
                      <p className="text-xs text-red-400">Se requiere al menos un diagnóstico CIE-10</p>
                    )}
                  </div>

                  {/* Pronóstico y progreso */}
                  <div className="card space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pronóstico y progreso</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-field">Pronóstico</label>
                        <div className="flex gap-1">
                          {(['favorable', 'reservado', 'desfavorable'] as const).map(p => (
                            <button key={p} type="button" onClick={() => set('pronostico', p)}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border capitalize transition-colors ${formData.pronostico === p ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-500'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="label-field">Evolución</label>
                        <div className="flex gap-1">
                          {(['improving', 'stable', 'declining'] as const).map(p => (
                            <button key={p} type="button" onClick={() => set('progress', p)}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors ${formData.progress === p ? 'border-salmon-400 bg-salmon-50 text-salmon-700' : 'border-gray-200 text-gray-500'}`}>
                              {progressLabels[p]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 6.2.6 Tratamiento e indicaciones */}
                  <div className="card space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">§ 6.2.6 — Tratamiento e indicaciones médicas</p>
                    {formData.indicaciones.map((m, i) => (
                      <div key={i} className="bg-blue-50 rounded p-2 text-sm flex items-start gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-blue-900">{m.medicamento}</span>
                          <span className="text-blue-700 ml-2">{m.dosis} · {m.via} · {m.frecuencia} · {m.duracion}</span>
                          {m.instrucciones && <p className="text-blue-600 text-xs mt-0.5">{m.instrucciones}</p>}
                        </div>
                        <button type="button" onClick={() => set('indicaciones', formData.indicaciones.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input-field text-sm" placeholder="Medicamento *"
                        value={newMed.medicamento} onChange={e => setNewMed({ ...newMed, medicamento: e.target.value })} />
                      <input className="input-field text-sm" placeholder="Dosis *"
                        value={newMed.dosis} onChange={e => setNewMed({ ...newMed, dosis: e.target.value })} />
                      <select className="input-field text-sm" value={newMed.via}
                        onChange={e => setNewMed({ ...newMed, via: e.target.value as IndicacionMedica['via'] })}>
                        {VIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <input className="input-field text-sm" placeholder="Frecuencia (ej. cada 8h)"
                        value={newMed.frecuencia} onChange={e => setNewMed({ ...newMed, frecuencia: e.target.value })} />
                      <input className="input-field text-sm" placeholder="Duración (ej. 30 días)"
                        value={newMed.duracion} onChange={e => setNewMed({ ...newMed, duracion: e.target.value })} />
                      <input className="input-field text-sm" placeholder="Instrucciones especiales"
                        value={newMed.instrucciones} onChange={e => setNewMed({ ...newMed, instrucciones: e.target.value })} />
                    </div>
                    <button type="button" onClick={addIndicacion} className="text-sm text-salmon-600 hover:text-salmon-700 font-medium">
                      + Agregar medicamento
                    </button>
                    <div>
                      <label className="label-field">Plan terapéutico general</label>
                      <textarea className="input-field h-16 resize-none" placeholder="Técnicas psicoterapéuticas, referencias, seguimiento..."
                        value={formData.treatment} onChange={e => set('treatment', e.target.value)} />
                    </div>
                    <div>
                      <label className="label-field">Próxima cita</label>
                      <input type="date" className="input-field"
                        value={formData.proximaCita} onChange={e => set('proximaCita', e.target.value)} />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    <span>Al guardar, la nota quedará firmada digitalmente con hash SHA-256 e inmutable conforme a <strong>NOM-024-SSA3-2012</strong>. Solo se permiten addendums posteriores.</span>
                  </div>

                  <button type="submit" disabled={loading || formData.diagnosticos.length === 0} className="btn-primary w-full">
                    {loading ? 'Guardando...' : 'Guardar y Firmar Nota de Evolución'}
                  </button>
                </form>
              ) : (
                /* Log history */
                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <div className="card text-center py-8 text-gray-400">
                      <p>No hay notas de evolución para este paciente</p>
                    </div>
                  ) : (
                    logs.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
                      <div key={log.id} className="card">
                        {/* Header */}
                        <button className="w-full text-left" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{moodEmojis[Math.min(Math.floor(log.mood / 2.5), 4)]}</span>
                              <div>
                                <p className="font-medium text-sm text-gray-900">
                                  {log.diagnosticos?.[0]?.codigo
                                    ? <span className="font-mono text-salmon-600 mr-2">{log.diagnosticos[0].codigo}</span>
                                    : null}
                                  {log.diagnosticos?.[0]?.descripcion || 'Nota de evolución'}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(log.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  {' · '}{log.doctorNombre}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${progressColors[log.progress]}`}>{progressLabels[log.progress]}</span>
                              {log.riesgoSuicida !== 'nulo' && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riesgoColors[log.riesgoSuicida]}`}>
                                  ⚠ Riesgo {log.riesgoSuicida}
                                </span>
                              )}
                              <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {expandedLog === log.id && (
                          <div className="mt-4 space-y-3 border-t pt-4">
                            {log.motivoConsulta && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Motivo de consulta</p>
                                <p className="text-sm text-gray-700">{log.motivoConsulta}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Evolución clínica</p>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.evolucionClinica}</p>
                            </div>
                            {log.exploracionFisica && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Exploración física</p>
                                <p className="text-sm text-gray-700">{log.exploracionFisica}</p>
                              </div>
                            )}
                            {log.symptoms?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Síntomas</p>
                                <div className="flex flex-wrap gap-1">
                                  {log.symptoms.map(s => <span key={s} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{s}</span>)}
                                </div>
                              </div>
                            )}

                            {/* Signos vitales */}
                            {log.signosVitales && Object.values(log.signosVitales).some(v => v) && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Signos vitales</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  {log.signosVitales.tensionArterial && <span className="bg-gray-50 rounded p-1.5">T/A: <strong>{log.signosVitales.tensionArterial}</strong></span>}
                                  {log.signosVitales.frecuenciaCardiaca && <span className="bg-gray-50 rounded p-1.5">FC: <strong>{log.signosVitales.frecuenciaCardiaca} lpm</strong></span>}
                                  {log.signosVitales.temperatura && <span className="bg-gray-50 rounded p-1.5">Temp: <strong>{log.signosVitales.temperatura}°C</strong></span>}
                                  {log.signosVitales.peso && <span className="bg-gray-50 rounded p-1.5">Peso: <strong>{log.signosVitales.peso} kg</strong></span>}
                                  {log.signosVitales.talla && <span className="bg-gray-50 rounded p-1.5">Talla: <strong>{log.signosVitales.talla} cm</strong></span>}
                                  {log.signosVitales.oximetria && <span className="bg-gray-50 rounded p-1.5">SpO₂: <strong>{log.signosVitales.oximetria}%</strong></span>}
                                </div>
                              </div>
                            )}

                            {/* Diagnósticos */}
                            {log.diagnosticos?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnósticos CIE-10</p>
                                {log.diagnosticos.map((d, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <span className="font-mono font-medium text-salmon-600">{d.codigo}</span>
                                    <span className="text-gray-700">{d.descripcion}</span>
                                    <span className="text-xs text-gray-400">({d.tipo})</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Indicaciones */}
                            {log.indicaciones?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Indicaciones médicas</p>
                                {log.indicaciones.map((m, i) => (
                                  <div key={i} className="bg-blue-50 rounded p-2 text-xs mb-1">
                                    <span className="font-medium text-blue-900">{m.medicamento}</span>
                                    <span className="text-blue-700 ml-2">{m.dosis} · {m.via} · {m.frecuencia} · {m.duracion}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {log.treatment && (
                              <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Plan terapéutico</p>
                                <p className="text-sm text-gray-700">{log.treatment}</p>
                              </div>
                            )}

                            {/* Addendums */}
                            {log.addendums?.length > 0 && (
                              <div className="border-t pt-3">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Addendums</p>
                                {log.addendums.map((a, i) => (
                                  <div key={i} className="bg-yellow-50 border border-yellow-100 rounded p-2 text-xs mb-1">
                                    <p className="text-yellow-700">{a.contenido}</p>
                                    <p className="text-yellow-500 mt-0.5">{a.usuario} · {new Date(a.fecha).toLocaleDateString('es-MX')}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Firma digital */}
                            <div className="flex items-center justify-between border-t pt-3">
                              <div className="flex items-center gap-1.5 text-xs text-green-600">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                <span>Firmado · {log.firmaDigital?.slice(0, 16)}…</span>
                              </div>
                              <button onClick={() => setAddendumLog(addendumLog === log.id ? null : log.id)}
                                className="text-xs text-salmon-500 hover:text-salmon-600 font-medium">
                                + Addendum
                              </button>
                            </div>

                            {addendumLog === log.id && (
                              <div className="flex gap-2">
                                <input className="input-field flex-1 text-sm" placeholder="Texto del addendum..."
                                  value={addendumText} onChange={e => setAddendumText(e.target.value)} />
                                <button onClick={() => handleAddendum(log.id)} className="btn-primary text-sm px-3">Guardar</button>
                              </div>
                            )}
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
              <svg className="w-14 h-14 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              <p className="font-medium">Selecciona un paciente</p>
              <p className="text-sm mt-1">para ver su expediente clínico</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
