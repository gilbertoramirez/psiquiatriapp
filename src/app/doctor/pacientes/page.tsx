'use client';

import { useEffect, useState } from 'react';
import { doctorPatients } from '@/lib/api';
import { Patient } from '@/types';

interface FormData {
  nombre: string;
  telefono: string;
  fechaNacimiento: string;
  curp: string;
  contactoEmergencia: string;
  telefonoEmergencia: string;
  notas: string;
}

const emptyForm: FormData = {
  nombre: '',
  telefono: '',
  fechaNacimiento: '',
  curp: '',
  contactoEmergencia: '',
  telefonoEmergencia: '',
  notas: '',
};

export default function PacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await doctorPatients.list();
      setPatients(data);
    } catch {
      setError('Error al cargar pacientes');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true);
    setError('');
    try {
      const created = await doctorPatients.create({
        nombre: form.nombre,
        telefono: form.telefono || undefined,
        fechaNacimiento: form.fechaNacimiento || undefined,
        curp: form.curp || undefined,
        contactoEmergencia: form.contactoEmergencia || undefined,
        telefonoEmergencia: form.telefonoEmergencia || undefined,
        notas: form.notas || undefined,
      });
      setPatients(prev => [created, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
      setSuccess('Paciente registrado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar paciente');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    try {
      const updated = await doctorPatients.update(editing.id, {
        nombre: editForm.nombre,
        telefono: editForm.telefono || undefined,
        fechaNacimiento: editForm.fechaNacimiento || undefined,
        curp: editForm.curp || undefined,
        contactoEmergencia: editForm.contactoEmergencia || undefined,
        telefonoEmergencia: editForm.telefonoEmergencia || undefined,
        notas: editForm.notas || undefined,
      });
      setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      setEditing(null);
      setSuccess('Paciente actualizado');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar paciente');
    } finally {
      setSaving(false);
    }
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setEditForm({
      nombre: p.name,
      telefono: p.phone || '',
      fechaNacimiento: p.dateOfBirth || '',
      curp: p.curp || '',
      contactoEmergencia: p.emergencyContact || '',
      telefonoEmergencia: p.emergencyPhone || '',
      notas: p.notas || '',
    });
  }

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.curp || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  );

  function calcAge(dob?: string) {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  }

  const fieldCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-salmon-400";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  function PatientForm({ data, onChange, onSubmit, onCancel, title }: {
    data: FormData;
    onChange: (d: FormData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    title: string;
  }) {
    return (
      <form onSubmit={onSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Nombre completo <span className="text-red-500">*</span></label>
            <input className={fieldCls} value={data.nombre} onChange={e => onChange({ ...data, nombre: e.target.value })} placeholder="Nombre completo del paciente" required />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input className={fieldCls} value={data.telefono} onChange={e => onChange({ ...data, telefono: e.target.value })} placeholder="+52 55 0000 0000" />
          </div>
          <div>
            <label className={labelCls}>Fecha de nacimiento</label>
            <input type="date" className={fieldCls} value={data.fechaNacimiento} onChange={e => onChange({ ...data, fechaNacimiento: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>CURP</label>
            <input className={fieldCls} value={data.curp} onChange={e => onChange({ ...data, curp: e.target.value.toUpperCase() })} placeholder="XXXX000000XXXXXXXX00" maxLength={18} />
          </div>
          <div>
            <label className={labelCls}>Contacto de emergencia</label>
            <input className={fieldCls} value={data.contactoEmergencia} onChange={e => onChange({ ...data, contactoEmergencia: e.target.value })} placeholder="Nombre del contacto" />
          </div>
          <div>
            <label className={labelCls}>Teléfono de emergencia</label>
            <input className={fieldCls} value={data.telefonoEmergencia} onChange={e => onChange({ ...data, telefonoEmergencia: e.target.value })} placeholder="+52 55 0000 0000" />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Notas internas</label>
            <textarea className={fieldCls} rows={3} value={data.notas} onChange={e => onChange({ ...data, notas: e.target.value })} placeholder="Observaciones, referencias, contexto..." />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-salmon-400 text-white rounded-lg hover:bg-salmon-500 disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mis Pacientes</h1>
          <p className="text-sm text-gray-500 mt-1">Pacientes registrados directamente por usted</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditing(null); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-salmon-400 text-white rounded-lg hover:bg-salmon-500 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nuevo paciente
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>
      )}

      {showForm && !editing && (
        <PatientForm
          title="Registrar nuevo paciente"
          data={form}
          onChange={setForm}
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setError(''); setForm(emptyForm); }}
        />
      )}

      {editing && (
        <PatientForm
          title={`Editar paciente: ${editing.name}`}
          data={editForm}
          onChange={setEditForm}
          onSubmit={handleUpdate}
          onCancel={() => { setEditing(null); setError(''); }}
        />
      )}

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-salmon-400"
          placeholder="Buscar por nombre, CURP o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-salmon-400 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <p className="font-medium">{search ? 'No se encontraron pacientes' : 'Aún no hay pacientes registrados'}</p>
          {!search && <p className="text-sm mt-1">Haga clic en "Nuevo paciente" para comenzar</p>}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(p => {
            const age = calcAge(p.dateOfBirth);
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-salmon-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-salmon-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-salmon-600 font-semibold text-sm">{p.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{p.name}</h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {age !== null && <span>{age} años</span>}
                        {p.phone && <span>{p.phone}</span>}
                        {p.curp && <span className="font-mono">{p.curp}</span>}
                      </div>
                      {p.notas && (
                        <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{p.notas}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <a
                      href={`/doctor/expediente?patientId=${p.id}`}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      Expediente
                    </a>
                    <a
                      href={`/doctor/bitacora?patientId=${p.id}`}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                    >
                      Notas
                    </a>
                    <button
                      onClick={() => openEdit(p)}
                      className="px-3 py-1.5 text-xs bg-salmon-50 text-salmon-600 rounded-lg hover:bg-salmon-100 border border-salmon-200"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        {filtered.length} paciente{filtered.length !== 1 ? 's' : ''} registrado{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
