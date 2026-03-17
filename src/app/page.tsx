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

  const handleGoogleSSO = () => {
    // Redirect to Google OAuth endpoint
    // The GOOGLE_CLIENT_ID env var must be set in .env.local
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const redirectUri = `${window.location.origin}/api/auth/google/callback`;
    const scope = 'openid email profile';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = url;
  };

  if (mode === 'landing') {
    return (
      <div className="min-h-screen bg-white">
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-salmon-400 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
            </div>
            <span className="text-gray-900 text-xl font-bold">PsiquiatrIApp</span>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMode('login')} className="text-gray-600 hover:text-salmon-500 font-medium px-4 py-2 transition-colors">Iniciar Sesión</button>
            <button onClick={() => setMode('register')} className="bg-salmon-400 text-white px-5 py-2 rounded-lg font-medium hover:bg-salmon-500 transition-colors">Registrarse</button>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Tu salud mental,<br />
                <span className="text-salmon-400">nuestra prioridad</span>
              </h1>
              <p className="mt-6 text-lg text-gray-500 max-w-lg">
                Gestiona tus citas psiquiátricas, recetas médicas y recomendaciones de tratamiento desde una sola plataforma segura y fácil de usar.
              </p>
              <div className="mt-10 flex gap-4">
                <button onClick={() => setMode('register')} className="bg-salmon-400 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-salmon-500 transition-colors shadow-lg shadow-salmon-200">
                  Comenzar Ahora
                </button>
                <button onClick={() => setMode('login')} className="border-2 border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl font-semibold text-lg hover:border-salmon-300 hover:text-salmon-500 transition-colors">
                  Ya tengo cuenta
                </button>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[
                { icon: '📅', title: 'Agenda Citas', desc: 'Calendario interactivo con horarios disponibles', bg: 'bg-salmon-50 border-salmon-100' },
                { icon: '💊', title: 'Recetas Digitales', desc: 'Accede a tus recetas desde cualquier lugar', bg: 'bg-primary-50 border-primary-100' },
                { icon: '📋', title: 'Seguimiento', desc: 'Recomendaciones y pasos personalizados', bg: 'bg-salmon-50 border-salmon-100' },
                { icon: '💳', title: 'Pagos con Stripe', desc: 'Paga tu consulta de forma rápida y segura', bg: 'bg-primary-50 border-primary-100' },
              ].map((f, i) => (
                <div key={i} className={`rounded-2xl p-6 border ${f.bg}`}>
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="text-gray-900 font-semibold mb-1">{f.title}</h3>
                  <p className="text-gray-500 text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Blog preview */}
          <div className="mt-24">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-900">Blog de Investigación</h2>
              <p className="text-gray-500 mt-2">Artículos y recursos de nuestros especialistas</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'Manejo de la Ansiedad en Tiempos Modernos', excerpt: 'Técnicas basadas en evidencia para manejar la ansiedad en el día a día...' },
                { title: 'La Importancia del Sueño en la Salud Mental', excerpt: 'Cómo la higiene del sueño impacta directamente en tu bienestar emocional...' },
                { title: 'Mindfulness y Psiquiatría', excerpt: 'Integrando prácticas de atención plena en el tratamiento psiquiátrico...' },
              ].map((post, i) => (
                <div key={i} className="card hover:shadow-md transition-shadow cursor-pointer border-t-4 border-t-salmon-300">
                  <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-gray-500 text-sm">{post.excerpt}</p>
                  <button onClick={() => setMode('login')} className="text-salmon-500 text-sm font-medium mt-3 hover:text-salmon-600">Leer más →</button>
                </div>
              ))}
            </div>
          </div>
        </main>

        <footer className="border-t border-gray-100 py-6 text-center text-gray-400 text-sm">
          &copy; 2026 PsiquiatrIApp. Todos los derechos reservados.
        </footer>
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
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow-sm text-salmon-600' : 'text-gray-500'}`}>
              Iniciar Sesión
            </button>
            <button onClick={() => { setMode('register'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow-sm text-salmon-600' : 'text-gray-500'}`}>
              Registrarse
            </button>
          </div>

          {/* Google SSO Button */}
          <button onClick={handleGoogleSSO} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Continuar con Google</span>
          </button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-gray-400">o con email</span></div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg text-sm">{error}</div>
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

        <button onClick={() => setMode('landing')} className="mt-6 text-salmon-400 hover:text-salmon-500 text-sm mx-auto block transition-colors">
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}
