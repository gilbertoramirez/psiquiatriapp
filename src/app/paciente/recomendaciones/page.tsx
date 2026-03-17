'use client';

import { useState, useEffect } from 'react';
import { recommendations as recsApi } from '@/lib/api';
import { Recommendation } from '@/types';

const categoryColors: Record<string, string> = {
  exercise: 'bg-green-100 text-green-800',
  diet: 'bg-orange-100 text-orange-800',
  therapy: 'bg-purple-100 text-purple-800',
  lifestyle: 'bg-blue-100 text-blue-800',
  medication: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};

const categoryLabels: Record<string, string> = {
  exercise: 'Ejercicio',
  diet: 'Alimentación',
  therapy: 'Terapia',
  lifestyle: 'Estilo de vida',
  medication: 'Medicación',
  other: 'Otro',
};

const priorityColors: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

export default function RecomendacionesPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [selected, setSelected] = useState<Recommendation | null>(null);

  useEffect(() => {
    recsApi.list().then(setRecs).catch(() => {});
  }, []);

  const toggleStep = (recId: string, stepOrder: number) => {
    setRecs(prev => prev.map(r => {
      if (r.id !== recId) return r;
      return {
        ...r,
        steps: r.steps.map(s => s.order === stepOrder ? { ...s, completed: !s.completed } : s),
      };
    }));
    if (selected?.id === recId) {
      setSelected(prev => prev ? {
        ...prev,
        steps: prev.steps.map(s => s.order === stepOrder ? { ...s, completed: !s.completed } : s),
      } : null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Recomendaciones</h1>
        <p className="text-gray-500 text-sm mt-1">Pasos y recomendaciones de tu doctor para tu bienestar</p>
      </div>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver
          </button>

          <div className="card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[selected.category]}`}>
                    {categoryLabels[selected.category]}
                  </span>
                  <span className={`text-xs font-medium ${priorityColors[selected.priority]}`}>
                    Prioridad: {selected.priority === 'high' ? 'Alta' : selected.priority === 'medium' ? 'Media' : 'Baja'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400">{new Date(selected.date).toLocaleDateString('es-MX')}</p>
            </div>

            <p className="text-gray-700 mb-6">{selected.description}</p>

            {selected.steps.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Pasos a seguir</h3>
                <div className="space-y-2">
                  {selected.steps.map(step => (
                    <button
                      key={step.order}
                      onClick={() => toggleStep(selected.id, step.order)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                        step.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        step.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {step.completed && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${step.completed ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                          Paso {step.order}
                        </p>
                        <p className={`text-sm ${step.completed ? 'text-green-600' : 'text-gray-600'}`}>{step.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-4 bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progreso</span>
                    <span className="font-medium">{selected.steps.filter(s => s.completed).length}/{selected.steps.length}</span>
                  </div>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-accent-500 rounded-full transition-all" style={{ width: `${(selected.steps.filter(s => s.completed).length / selected.steps.length) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              <p className="text-gray-500 font-medium">No hay recomendaciones</p>
              <p className="text-gray-400 text-sm mt-1">Tu doctor agregará recomendaciones después de tu consulta</p>
            </div>
          ) : (
            recs.map(rec => {
              const progress = rec.steps.length > 0 ? Math.round((rec.steps.filter(s => s.completed).length / rec.steps.length) * 100) : 0;
              return (
                <button key={rec.id} onClick={() => setSelected(rec)} className="card w-full text-left hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{rec.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[rec.category]}`}>
                      {categoryLabels[rec.category]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{rec.description}</p>
                  {rec.steps.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-accent-500 rounded-full" style={{ width: `${progress}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{progress}%</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
