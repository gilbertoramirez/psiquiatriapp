'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { patients as patientsApi, doctorProfile } from '@/lib/api';
import { Patient } from '@/types';

export default function ExpedientePage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    patientsApi.list().then((data) => {
      setPatientList(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      if (parsed.signatureData) setCurrentSignature(parsed.signatureData);
    }
  }, []);

  const handleDownload = (patientId: string) => {
    const token = localStorage.getItem('token');
    fetch(`/api/expediente?patientId=${patientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al generar expediente');
        return res.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expediente-${patientId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => setMessage({ type: 'error', text: 'Error al descargar expediente' }));
  };

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    return { canvas, ctx };
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const result = getCanvasContext();
    if (!result) return;
    const { canvas, ctx } = result;
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const result = getCanvasContext();
    if (!result) return;
    const { canvas, ctx } = result;
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const result = getCanvasContext();
    if (!result) return;
    const { canvas, ctx } = result;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');
    try {
      await doctorProfile.updateSignature(signatureData);
      setCurrentSignature(signatureData);
      setMessage({ type: 'success', text: 'Firma guardada exitosamente' });
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar firma' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-salmon-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Expediente Clinico</h1>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pacientes</h2>
            {patientList.length === 0 ? (
              <p className="text-gray-500">No hay pacientes registrados.</p>
            ) : (
              <div className="space-y-3">
                {patientList.map(patient => (
                  <div key={patient.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{patient.name}</p>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                      {patient.phone && <p className="text-sm text-gray-500">{patient.phone}</p>}
                    </div>
                    <button
                      onClick={() => handleDownload(patient.id)}
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Descargar Expediente
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Firma Digital</h2>

            {currentSignature && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">Firma actual:</p>
                <img src={currentSignature} alt="Firma actual" className="border rounded-lg w-full h-auto" />
              </div>
            )}

            <p className="text-sm text-gray-500 mb-2">Dibuje su firma:</p>
            <canvas
              ref={canvasRef}
              width={300}
              height={150}
              className="border-2 border-gray-300 rounded-lg cursor-crosshair w-full touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="flex gap-2 mt-3">
              <button onClick={clearCanvas} className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Limpiar
              </button>
              <button onClick={saveSignature} className="flex-1 btn-primary text-sm px-3 py-2">
                Guardar Firma
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
