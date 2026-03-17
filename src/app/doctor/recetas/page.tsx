'use client';

import { useState, useEffect } from 'react';
import { patients as patientsApi, prescriptions as prescriptionsApi, recommendations as recsApi } from '@/lib/api';
import { Patient, Prescription } from '@/types';

export default function DoctorRecetasPage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [allPrescriptions, setAllPrescriptions] = useState<Prescription[]>([]);
  const [tab, setTab] = useState<'prescriptions' | 'recommendations'>('prescriptions');
  const [showForm, setShowForm] = useState(false);

  // Prescription form
  const [rxForm, setRxForm] = useState({
    patientId: '',
    diagnosis: '',
    notes: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }],
  });

  // Recommendation form
  const [recForm, setRecForm] = useState({
    patientId: '',
    title: '',
    description: '',
    category: 'therapy',
    priority: 'medium',
    steps: [{ description: '' }],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    patientsApi.list().then(setPatientList).catch(() => {});
    prescriptionsApi.list().then(setAllPrescriptions).catch(() => {});
  }, []);

  const addMedication = () => {
    setRxForm(prev => ({ ...prev, medications: [...prev.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }] }));
  };

  const removeMedication = (i: number) => {
    setRxForm(prev => ({ ...prev, medications: prev.medications.filter((_, idx) => idx !== i) }));
  };

  const updateMedication = (i: number, field: string, value: string) => {
    setRxForm(prev => ({
      ...prev,
      medications: prev.medications.map((m, idx) => idx === i ? { ...m, [field]: value } : m),
    }));
  };

  const addStep = () => {
    setRecForm(prev => ({ ...prev, steps: [...prev.steps, { description: '' }] }));
  };

  const removeStep = (i: number) => {
    setRecForm(prev => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }));
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await prescriptionsApi.create(rxForm);
      setMessage({ type: 'success', text: 'Receta creada exitosamente' });
      setShowForm(false);
      setRxForm({ patientId: '', diagnosis: '', notes: '', medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }] });
      prescriptionsApi.list().then(setAllPrescriptions);
    } catch {
      setMessage({ type: 'error', text: 'Error al crear receta' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await recsApi.create(recForm);
      setMessage({ type: 'success', text: 'Recomendación creada exitosamente' });
      setShowForm(false);
      setRecForm({ patientId: '', title: '', description: '', category: 'therapy', priority: 'medium', steps: [{ description: '' }] });
    } catch {
      setMessage({ type: 'error', text: 'Error al crear recomendación' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recetas y Recomendaciones</h1>
          <p className="text-gray-500 text-sm mt-1">Crea recetas médicas y recomendaciones para tus pacientes</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Ver Historial' : '+ Crear Nuevo'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('prescriptions')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'prescriptions' ? 'bg-white shadow-sm text-salmon-700' : 'text-gray-500'}`}>
          Recetas Médicas
        </button>
        <button onClick={() => setTab('recommendations')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'recommendations' ? 'bg-white shadow-sm text-salmon-700' : 'text-gray-500'}`}>
          Recomendaciones
        </button>
      </div>

      {showForm ? (
        <div className="card">
          {tab === 'prescriptions' ? (
            <form onSubmit={handleCreatePrescription} className="space-y-4">
              <h3 className="font-semibold text-lg">Nueva Receta Médica</h3>

              <div>
                <label className="label-field">Paciente</label>
                <select className="input-field" value={rxForm.patientId} onChange={e => setRxForm({ ...rxForm, patientId: e.target.value })} required>
                  <option value="">Seleccionar paciente</option>
                  {patientList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label-field">Diagnóstico</label>
                <input type="text" className="input-field" placeholder="Ej: Trastorno de ansiedad generalizada" value={rxForm.diagnosis} onChange={e => setRxForm({ ...rxForm, diagnosis: e.target.value })} required />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-field mb-0">Medicamentos</label>
                  <button type="button" onClick={addMedication} className="text-salmon-500 text-sm font-medium hover:text-salmon-600">+ Agregar</button>
                </div>
                {rxForm.medications.map((med, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Medicamento {i + 1}</span>
                      {rxForm.medications.length > 1 && (
                        <button type="button" onClick={() => removeMedication(i)} className="text-red-500 text-xs hover:text-red-700">Eliminar</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" className="input-field text-sm" placeholder="Nombre del medicamento" value={med.name} onChange={e => updateMedication(i, 'name', e.target.value)} required />
                      <input type="text" className="input-field text-sm" placeholder="Dosis (ej: 50mg)" value={med.dosage} onChange={e => updateMedication(i, 'dosage', e.target.value)} required />
                      <input type="text" className="input-field text-sm" placeholder="Frecuencia (ej: cada 12 hrs)" value={med.frequency} onChange={e => updateMedication(i, 'frequency', e.target.value)} required />
                      <input type="text" className="input-field text-sm" placeholder="Duración (ej: 30 días)" value={med.duration} onChange={e => updateMedication(i, 'duration', e.target.value)} required />
                    </div>
                    <input type="text" className="input-field text-sm mt-2" placeholder="Instrucciones especiales (opcional)" value={med.instructions} onChange={e => updateMedication(i, 'instructions', e.target.value)} />
                  </div>
                ))}
              </div>

              <div>
                <label className="label-field">Notas adicionales</label>
                <textarea className="input-field h-20 resize-none" placeholder="Observaciones, contraindicaciones, seguimiento..."
                  value={rxForm.notes} onChange={e => setRxForm({ ...rxForm, notes: e.target.value })} />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Creando...' : 'Crear Receta'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateRecommendation} className="space-y-4">
              <h3 className="font-semibold text-lg">Nueva Recomendación</h3>

              <div>
                <label className="label-field">Paciente</label>
                <select className="input-field" value={recForm.patientId} onChange={e => setRecForm({ ...recForm, patientId: e.target.value })} required>
                  <option value="">Seleccionar paciente</option>
                  {patientList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label-field">Título</label>
                <input type="text" className="input-field" placeholder="Ej: Rutina de relajación diaria" value={recForm.title} onChange={e => setRecForm({ ...recForm, title: e.target.value })} required />
              </div>

              <div>
                <label className="label-field">Descripción</label>
                <textarea className="input-field h-20 resize-none" placeholder="Descripción detallada de la recomendación..."
                  value={recForm.description} onChange={e => setRecForm({ ...recForm, description: e.target.value })} required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Categoría</label>
                  <select className="input-field" value={recForm.category} onChange={e => setRecForm({ ...recForm, category: e.target.value })}>
                    <option value="exercise">Ejercicio</option>
                    <option value="diet">Alimentación</option>
                    <option value="therapy">Terapia</option>
                    <option value="lifestyle">Estilo de vida</option>
                    <option value="medication">Medicación</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="label-field">Prioridad</label>
                  <select className="input-field" value={recForm.priority} onChange={e => setRecForm({ ...recForm, priority: e.target.value })}>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-field mb-0">Pasos a seguir</label>
                  <button type="button" onClick={addStep} className="text-salmon-500 text-sm font-medium hover:text-salmon-600">+ Agregar paso</button>
                </div>
                {recForm.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-400 w-6">{i + 1}.</span>
                    <input type="text" className="input-field flex-1" placeholder={`Paso ${i + 1}...`}
                      value={step.description} onChange={e => {
                        const steps = [...recForm.steps];
                        steps[i] = { description: e.target.value };
                        setRecForm({ ...recForm, steps });
                      }} required />
                    {recForm.steps.length > 1 && (
                      <button type="button" onClick={() => removeStep(i)} className="text-red-500 hover:text-red-700 p-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Creando...' : 'Crear Recomendación'}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'prescriptions' ? (
            allPrescriptions.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-400">No hay recetas creadas</p>
              </div>
            ) : (
              allPrescriptions.sort((a, b) => b.date.localeCompare(a.date)).map(rx => {
                const patient = patientList.find(p => p.id === rx.patientId);
                return (
                  <div key={rx.id} className="card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{patient?.name || 'Paciente'}</p>
                        <p className="text-sm text-gray-500">{rx.diagnosis}</p>
                      </div>
                      <p className="text-xs text-gray-400">{new Date(rx.date).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {rx.medications.map((m, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{m.name} - {m.dosage}</span>
                      ))}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-400">Las recomendaciones creadas se mostrarán en el portal del paciente</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Crear Recomendación</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
