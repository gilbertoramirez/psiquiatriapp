'use client';

import { useState, useEffect, useCallback } from 'react';
import { invitations as invitationsApi } from '@/lib/api';

interface InvitationWithPatient {
  id: string;
  token: string;
  patientId: string;
  email: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  acceptedAt?: string;
  patientName?: string;
  patientPhone?: string;
}

export default function PacientesPage() {
  const [invitationsList, setInvitationsList] = useState<InvitationWithPatient[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState('');

  const loadInvitations = useCallback(async () => {
    try {
      const data = await invitationsApi.list();
      setInvitationsList(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadInvitations(); }, [loadInvitations]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    setGeneratedLink('');
    try {
      const res = await invitationsApi.create(formData);
      const link = `${window.location.origin}${res.invitationUrl}`;
      setGeneratedLink(link);
      setMessage({ type: 'success', text: `Invitación creada para ${formData.name}` });
      setFormData({ name: '', email: '', phone: '' });
      loadInvitations();
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al crear invitación' });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = (link: string, id: string) => {
    navigator.clipboard.writeText(link);
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 text-sm mt-1">Registra pacientes y genera enlaces de invitación</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setGeneratedLink(''); setMessage({ type: '', text: '' }); }} className="btn-primary">
          {showForm ? 'Ver Lista' : '+ Nuevo Paciente'}
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {showForm ? (
        <div className="card max-w-lg mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Registrar Nuevo Paciente</h2>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label-field">Nombre completo *</label>
              <input type="text" className="input-field" placeholder="Nombre del paciente" value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Email *</label>
              <input type="email" className="input-field" placeholder="paciente@email.com" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div>
              <label className="label-field">Teléfono</label>
              <input type="tel" className="input-field" placeholder="+52 33..." value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creando...' : 'Crear Invitación'}
            </button>
          </form>

          {generatedLink && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">Enlace de invitación generado:</p>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={generatedLink} className="input-field text-xs flex-1" />
                <button onClick={() => copyLink(generatedLink, 'new')} className="btn-primary text-sm py-2 px-4 whitespace-nowrap">
                  {copied === 'new' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-green-600 mt-2">Comparte este enlace con tu paciente por WhatsApp o email</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {invitationsList.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <p className="text-gray-500 font-medium">No hay pacientes registrados</p>
              <p className="text-gray-400 text-sm mt-1">Registra tu primer paciente con el botón &quot;+ Nuevo Paciente&quot;</p>
            </div>
          ) : (
            invitationsList.map(inv => (
              <div key={inv.id} className="card flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-salmon-100 rounded-xl flex items-center justify-center">
                    <span className="text-salmon-700 font-bold text-sm">
                      {inv.patientName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{inv.patientName}</p>
                    <p className="text-sm text-gray-500">{inv.email}</p>
                    {inv.patientPhone && <p className="text-xs text-gray-400">{inv.patientPhone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    inv.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {inv.status === 'accepted' ? 'Activo' : 'Pendiente'}
                  </span>
                  {inv.status === 'pending' && (
                    <button
                      onClick={() => copyLink(`${window.location.origin}/invitacion/${inv.token}`, inv.id)}
                      className="text-sm text-salmon-500 hover:text-salmon-600 font-medium"
                    >
                      {copied === inv.id ? 'Copiado' : 'Copiar enlace'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
