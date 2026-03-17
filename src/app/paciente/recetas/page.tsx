'use client';

import { useState, useEffect } from 'react';
import { prescriptions as prescriptionsApi } from '@/lib/api';
import { Prescription } from '@/types';

export default function RecetasPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selected, setSelected] = useState<Prescription | null>(null);

  useEffect(() => {
    prescriptionsApi.list().then(setPrescriptions).catch(() => {});
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mis Recetas Médicas</h1>
        <p className="text-gray-500 text-sm mt-1">Consulta tus recetas y medicamentos prescritos</p>
      </div>

      {selected ? (
        <div>
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver a recetas
          </button>

          <div className="card">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Receta Médica</h2>
                <p className="text-sm text-gray-500">Fecha: {new Date(selected.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-gray-500">Dr(a): {selected.doctorName}</p>
              </div>
              <span className="text-xs bg-primary-100 text-primary-700 px-3 py-1 rounded-full font-medium">#{selected.id.slice(-6)}</span>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Diagnóstico</h3>
              <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selected.diagnosis}</p>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">Medicamentos</h3>
              <div className="space-y-3">
                {selected.medications.map((med, i) => (
                  <div key={i} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-blue-900">{med.name}</p>
                        <p className="text-sm text-blue-700">Dosis: {med.dosage}</p>
                        <p className="text-sm text-blue-700">Frecuencia: {med.frequency}</p>
                        <p className="text-sm text-blue-700">Duración: {med.duration}</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                    </div>
                    {med.instructions && <p className="text-sm text-blue-600 mt-2 italic">Instrucciones: {med.instructions}</p>}
                  </div>
                ))}
              </div>
            </div>

            {selected.notes && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Notas adicionales</h3>
                <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selected.notes}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-gray-500 font-medium">No hay recetas médicas</p>
              <p className="text-gray-400 text-sm mt-1">Las recetas aparecerán aquí después de tu consulta</p>
            </div>
          ) : (
            prescriptions.map(rx => (
              <button key={rx.id} onClick={() => setSelected(rx)} className="card w-full text-left hover:shadow-md transition-shadow flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{rx.diagnosis}</p>
                  <p className="text-sm text-gray-500">{rx.medications.length} medicamento(s) - {new Date(rx.date).toLocaleDateString('es-MX')}</p>
                  <p className="text-xs text-gray-400">{rx.doctorName}</p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
