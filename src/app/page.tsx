'use client';

import { useState } from 'react';
import { auth } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [mode, setMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '', phone: '', dateOfBirth: '', emergencyContact: '', emergencyPhone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(loginData);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push(res.user.role === 'doctor' ? '/doctor/dashboard' : '/paciente/citas');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.register(registerData);
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/paciente/citas');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </div>
            <span className="text-white text-xl font-bold">PsiquiatrIApp</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMode('login')} className="text-white hover:text-primary-200 font-medium px-4 py-2 transition-colors">Iniciar Sesión</button>
            <button onClick={() => setMode('register')} className="bg-white text-primary-700 px-5 py-2 rounded-lg font-medium hover:bg-primary-50 transition-colors">Registrarse</button>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Tu salud mental,<br />
                <span className="text-primary-200">nuestra prioridad</span>
              </h1>
              <p className="mt-6 text-lg text-primary-100 max-w-lg">
                Gestiona tus citas psiquiátricas, recetas médicas y recomendaciones de tratamiento desde una sola plataforma segura y fácil de usar.
              </p>
              <div className="mt-10 flex gap-4">
                <button onClick={() => setMode('register')} className="bg-white text-primary-700 px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-primary-50 transition-colors shadow-lg">
                  Comenzar Ahora
                </button>
                <button onClick={() => setMode('login')} className="border-2 border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-white/10 transition-colors">
                  Ya tengo cuenta
                </button>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { icon: '📅', title: 'Agenda Citas', desc: 'Calendario interactivo con horarios disponibles' },
                { icon: '💊', title: 'Recetas Digitales', desc: 'Accede a tus recetas desde cualquier lugar' },
                { icon: '📋', title: 'Seguimiento', desc: 'Recomendaciones y pasos personalizados' },
                { icon: '💳', title: 'Pagos Seguros', desc: 'Paga tu consulta de forma rápida y segura' },
              ].map((f, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-white font-semibold mb-1">{f.title}</h3>
                  <p className="text-primary-200 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="border-t border-white/10 py-6 text-center text-primary-200 text-sm">
          &copy; 2026 PsiquiatrIApp. Todos los derechos reservados.
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-white">PsiquiatrIApp</h1>
        </div>

        <div className="card">
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>
              Iniciar Sesión
            </button>
            <button onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-500'}`}>
              Registrarse
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="label-field">Email</label>
                <input type="email" className="input-field" placeholder="tu@email.com" value={loginData.email} onChange={e => setLoginData({ ...loginData, email: e.target.value })} required />
              </div>
              <div>
                <label className="label-field">Contraseña</label>
                <input type="password" className="input-field" placeholder="••••••••" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} required />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </button>
              <div className="text-center text-xs text-gray-400 mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="font-medium mb-1">Demo Doctor:</p>
                <p>dr.garcia@psiquiatriapp.com / doctor123</p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="label-field">Nombre completo *</label>
                <input type="text" className="input-field" placeholder="Juan Pérez" value={registerData.name} onChange={e => setRegisterData({ ...registerData, name: e.target.value })} required />
              </div>
              <div>
                <label className="label-field">Email *</label>
                <input type="email" className="input-field" placeholder="tu@email.com" value={registerData.email} onChange={e => setRegisterData({ ...registerData, email: e.target.value })} required />
              </div>
              <div>
                <label className="label-field">Contraseña *</label>
                <input type="password" className="input-field" placeholder="Mínimo 6 caracteres" value={registerData.password} onChange={e => setRegisterData({ ...registerData, password: e.target.value })} required minLength={6} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Teléfono</label>
                  <input type="tel" className="input-field" placeholder="+52 55..." value={registerData.phone} onChange={e => setRegisterData({ ...registerData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Fecha de nacimiento</label>
                  <input type="date" className="input-field" value={registerData.dateOfBirth} onChange={e => setRegisterData({ ...registerData, dateOfBirth: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field">Contacto emergencia</label>
                  <input type="text" className="input-field" placeholder="Nombre" value={registerData.emergencyContact} onChange={e => setRegisterData({ ...registerData, emergencyContact: e.target.value })} />
                </div>
                <div>
                  <label className="label-field">Tel. emergencia</label>
                  <input type="tel" className="input-field" placeholder="+52 55..." value={registerData.emergencyPhone} onChange={e => setRegisterData({ ...registerData, emergencyPhone: e.target.value })} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Registrando...' : 'Crear Cuenta'}
              </button>
            </form>
          )}
        </div>

        <button onClick={() => setMode('landing')} className="mt-6 text-primary-200 hover:text-white text-sm mx-auto block transition-colors">
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
