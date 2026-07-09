'use client';

import { useState, useEffect, use } from 'react';
import { invitations as invitationsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function InvitacionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [valid, setValid] = useState(false);

  useEffect(() => {
    invitationsApi.verify(token).then(data => {
      if (data.valid) {
        setPatientName(data.patientName);
        setPatientEmail(data.patientEmail);
        setValid(true);
      } else {
        setError('Esta invitación no es válida o ya fue utilizada.');
      }
    }).catch(() => {
      setError('Esta invitación no es válida o ya fue utilizada.');
    }).finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);
    try {
      const res = await invitationsApi.accept({ token, password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/paciente/citas');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al activar cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-salmon-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-salmon-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PsiquiatrIApp</h1>
        </div>

        <div className="card border border-gray-200">
          {!valid ? (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              <p className="text-gray-500 font-medium">{error}</p>
              <a href="/" className="text-salmon-500 text-sm mt-4 inline-block hover:text-salmon-600">Ir al inicio</a>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Bienvenido/a, {patientName}</h2>
                <p className="text-sm text-gray-500 mt-1">Crea tu contraseña para acceder a tu portal de paciente</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-field">Email</label>
                  <input type="email" className="input-field bg-gray-50" value={patientEmail} disabled />
                </div>
                <div>
                  <label className="label-field">Contraseña</label>
                  <input type="password" className="input-field" placeholder="Mínimo 6 caracteres" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <div>
                  <label className="label-field">Confirmar contraseña</label>
                  <input type="password" className="input-field" placeholder="Repite tu contraseña" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} required minLength={6} />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary w-full">
                  {submitting ? 'Activando cuenta...' : 'Activar Cuenta'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
