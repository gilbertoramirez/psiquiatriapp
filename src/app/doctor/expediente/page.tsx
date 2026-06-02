'use client';

import { useState, useEffect, useCallback } from 'react';
import { historiaClinica as hcApi, patients as patientsApi } from '@/lib/api';
import {
  Patient, HistoriaClinica, DiagnosticoCIE10, IndicacionMedica,
  FichaIdentificacion, AntecedentesHeredoFamiliares,
  AntecedentesPersonalesPatologicos, AntecedentesPersonalesNoPatologicos,
  AntecedentesPsiquiatricos, InterrogatorioPorAparatosYSistemas, SignosVitales,
} from '@/types';

const VIA_OPTIONS = ['oral', 'sublingual', 'intramuscular', 'intravenosa', 'topica', 'otra'] as const;

const emptyFicha = (): FichaIdentificacion => ({ nombre: '', edad: 0, sexo: 'masculino', fechaNacimiento: '' });
const emptyHeredoFam = (): AntecedentesHeredoFamiliares => ({
  diabetes: false, hipertension: false, cancer: false, cardiopatias: false,
  enfermedadesMentales: false, alcoholismo: false, drogadiccion: false, epilepsia: false,
});

function SectionHeader({ num, title, collapsed, onToggle, readonly }: {
  num: string; title: string; collapsed: boolean; onToggle: () => void; readonly?: boolean;
}) {
  return (
    <button type="button" onClick={onToggle}
      className="w-full flex items-center justify-between py-3 border-b border-gray-100 group">
      <div className="flex items-center gap-2">
        {num && <span className="text-xs font-mono text-salmon-400 bg-salmon-50 px-1.5 py-0.5 rounded">§{num}</span>}
        <span className="font-semibold text-sm text-gray-800">{title}</span>
        {readonly && <span className="text-xs text-gray-400">(solo lectura)</span>}
      </div>
      <svg className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export default function ExpedientePage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [hc, setHc] = useState<HistoriaClinica | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Form state
  const [ficha, setFicha] = useState<FichaIdentificacion>(emptyFicha());
  const [heredoFam, setHeredoFam] = useState<AntecedentesHeredoFamiliares>(emptyHeredoFam());
  const [patologicos, setPatologicos] = useState<AntecedentesPersonalesPatologicos>({});
  const [noPatologicos, setNoPatologicos] = useState<AntecedentesPersonalesNoPatologicos>({});
  const [psiquiatricos, setPsiquiatricos] = useState<AntecedentesPsiquiatricos>({});
  const [padecimiento, setPadecimiento] = useState('');
  const [interrogatorio, setInterrogatorio] = useState<InterrogatorioPorAparatosYSistemas>({});
  const [exploracionFisica, setExploracionFisica] = useState('');
  const [signosVitales, setSignosVitales] = useState<SignosVitales>({});
  const [examenMental, setExamenMental] = useState('');
  const [resultadosPrevios, setResultadosPrevios] = useState('');
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoCIE10[]>([]);
  const [pronostico, setPronostico] = useState('');
  const [planTerapeutico, setPlanTerapeutico] = useState('');
  const [indicaciones, setIndicaciones] = useState<IndicacionMedica[]>([]);
  const [newDiag, setNewDiag] = useState<DiagnosticoCIE10>({ codigo: '', descripcion: '', tipo: 'principal' });
  const [newMed, setNewMed] = useState<IndicacionMedica>({ medicamento: '', dosis: '', via: 'oral', frecuencia: '', duracion: '', instrucciones: '' });

  useEffect(() => { patientsApi.list().then(setPatientList).catch(() => {}); }, []);

  const resetForm = useCallback(() => {
    setFicha(emptyFicha()); setHeredoFam(emptyHeredoFam());
    setPatologicos({}); setNoPatologicos({}); setPsiquiatricos({});
    setPadecimiento(''); setInterrogatorio({});
    setExploracionFisica(''); setSignosVitales({});
    setExamenMental(''); setResultadosPrevios('');
    setDiagnosticos([]); setPronostico('');
    setPlanTerapeutico(''); setIndicaciones([]);
  }, []);

  const loadHC = useCallback(async (patient: Patient) => {
    try {
      const data = await hcApi.get(patient.id);
      if (data) {
        setHc(data); setIsNew(false);
        setFicha(data.fichaIdentificacion || emptyFicha());
        setHeredoFam(data.antecedentesHeredoFamiliares || emptyHeredoFam());
        setPatologicos(data.antecedentesPersonalesPatologicos || {});
        setNoPatologicos(data.antecedentesPersonalesNoPatologicos || {});
        setPsiquiatricos(data.antecedentesPsiquiatricos || {});
        setPadecimiento(data.padecimientoActual || '');
        setInterrogatorio(data.interrogatorio || {});
        setExploracionFisica(data.exploracionFisica || '');
        setSignosVitales(data.signosVitales || {});
        setExamenMental(data.examenMental || '');
        setResultadosPrevios(data.resultadosEstudiosPrevios || '');
        setDiagnosticos(data.diagnosticos || []);
        setPronostico(data.pronostico || '');
        setPlanTerapeutico(data.planTerapeutico || '');
        setIndicaciones(data.indicacionesIniciales || []);
        // Collapse all sections when viewing existing HC
        setCollapsed({ ficha: true, heredofam: true, patologicos: true, nopatologicos: true, psiquiatricos: true, padecimiento: false, interrogatorio: true, exploracion: true, diagnostico: false, plan: false });
      } else {
        setHc(null); setIsNew(true); resetForm();
        setFicha(prev => ({ ...prev, nombre: patient.name }));
        // All sections open for new HC
        setCollapsed({});
      }
    } catch {
      setHc(null); setIsNew(true); resetForm();
      setFicha(prev => ({ ...prev, nombre: patient.name }));
      setCollapsed({});
    }
  }, [resetForm]);

  useEffect(() => { if (selectedPatient) loadHC(selectedPatient); }, [selectedPatient, loadHC]);

  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  const sf = (field: string, value: unknown) => setFicha(prev => ({ ...prev, [field]: value }));

  const addDiag = () => {
    if (!newDiag.codigo || !newDiag.descripcion) return;
    setDiagnosticos([...diagnosticos, newDiag]);
    setNewDiag({ codigo: '', descripcion: '', tipo: 'principal' });
  };
  const addMed = () => {
    if (!newMed.medicamento || !newMed.dosis) return;
    setIndicaciones([...indicaciones, newMed]);
    setNewMed({ medicamento: '', dosis: '', via: 'oral', frecuencia: '', duracion: '', instrucciones: '' });
  };

  const handleSave = async () => {
    if (!selectedPatient) return;
    if (!ficha.nombre) { setMessage({ type: 'error', text: 'El nombre del paciente es obligatorio' }); return; }
    if (!padecimiento) { setMessage({ type: 'error', text: 'El padecimiento actual es obligatorio (NOM-004 §6.1.5)' }); return; }

    setLoading(true); setMessage({ type: '', text: '' });
    try {
      if (isNew) {
        const result = await hcApi.create({
          patientId: selectedPatient.id, fichaIdentificacion: ficha,
          antecedentesHeredoFamiliares: heredoFam, antecedentesPersonalesPatologicos: patologicos,
          antecedentesPersonalesNoPatologicos: noPatologicos, antecedentesPsiquiatricos: psiquiatricos,
          padecimientoActual: padecimiento, interrogatorio, exploracionFisica, signosVitales,
          examenMental, resultadosEstudiosPrevios: resultadosPrevios,
          diagnosticos, pronostico, planTerapeutico, indicacionesIniciales: indicaciones,
        });
        setHc(result); setIsNew(false);
        setMessage({ type: 'success', text: 'Historia clínica creada y firmada digitalmente (NOM-024)' });
        setCollapsed({ ficha: true, heredofam: true, patologicos: true, nopatologicos: true, psiquiatricos: true, padecimiento: false, interrogatorio: true, exploracion: true, diagnostico: false, plan: false });
      } else {
        const sections: [string, unknown][] = [
          ['fichaIdentificacion', ficha], ['antecedentesHeredoFamiliares', heredoFam],
          ['antecedentesPersonalesPatologicos', patologicos], ['antecedentesPersonalesNoPatologicos', noPatologicos],
          ['antecedentesPsiquiatricos', psiquiatricos], ['padecimientoActual', padecimiento],
          ['interrogatorio', interrogatorio], ['exploracionFisica', exploracionFisica],
          ['signosVitales', signosVitales], ['examenMental', examenMental],
          ['resultadosEstudiosPrevios', resultadosPrevios], ['diagnosticos', diagnosticos],
          ['pronostico', pronostico], ['planTerapeutico', planTerapeutico], ['indicacionesIniciales', indicaciones],
        ];
        let result;
        for (const [sec, dat] of sections) { result = await hcApi.update(selectedPatient.id, sec, dat); }
        if (result) setHc(result);
        setMessage({ type: 'success', text: 'Historia clínica actualizada con registro de auditoría' });
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Historia Clínica</h1>
        <p className="text-gray-500 text-sm mt-1">NOM-004-SSA3-2012 §6.1 · Expediente clínico electrónico</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Patient list */}
        <div className="card h-fit">
          <h2 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wide">Pacientes</h2>
          {patientList.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Los pacientes aparecerán una vez agenden cita.</p>
          ) : (
            <div className="space-y-1">
              {patientList.map(p => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setMessage({ type: '', text: '' }); }}
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
        <div className="lg:col-span-3">
          {selectedPatient ? (
            <div className="space-y-0">
              {/* Patient header */}
              <div className="card mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedPatient.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {hc ? <>Creada {new Date(hc.fechaCreacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} · {hc.auditTrail?.length || 0} registro(s) de auditoría</>
                      : 'Primera consulta — crear historia clínica'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {hc && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      <span>Firmada · {hc.firmaDigital?.slice(0, 12)}...</span>
                    </div>
                  )}
                  {!isNew && (
                    <button onClick={() => setCollapsed({})} className="text-xs text-salmon-500 hover:text-salmon-600 font-medium">
                      Expandir todo
                    </button>
                  )}
                </div>
              </div>

              {/* ═══════════════════════════════════════ */}
              {/* CONTINUOUS CLINICAL NOTE FORM           */}
              {/* ═══════════════════════════════════════ */}

              <div className="card">
                {/* ── §6.1.1 Ficha de identificación ── */}
                <SectionHeader num="6.1.1" title="Ficha de identificación" collapsed={!!collapsed.ficha} onToggle={() => toggle('ficha')} />
                {!collapsed.ficha && (
                  <div className="py-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label-field">Nombre completo <span className="text-red-400">*</span></label>
                        <input className="input-field" value={ficha.nombre} onChange={e => sf('nombre', e.target.value)} /></div>
                      <div><label className="label-field">CURP</label>
                        <input className="input-field font-mono" placeholder="18 caracteres" maxLength={18}
                          value={ficha.curp || ''} onChange={e => sf('curp', e.target.value.toUpperCase())} /></div>
                      <div><label className="label-field">Fecha de nacimiento</label>
                        <input type="date" className="input-field" value={ficha.fechaNacimiento}
                          onChange={e => { sf('fechaNacimiento', e.target.value);
                            if (e.target.value) sf('edad', Math.floor((Date.now() - new Date(e.target.value).getTime()) / 31557600000));
                          }} /></div>
                      <div><label className="label-field">Edad</label>
                        <input type="number" className="input-field" value={ficha.edad || ''} onChange={e => sf('edad', parseInt(e.target.value) || 0)} /></div>
                      <div><label className="label-field">Sexo</label>
                        <select className="input-field" value={ficha.sexo} onChange={e => sf('sexo', e.target.value)}>
                          <option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option>
                        </select></div>
                      <div><label className="label-field">Estado civil</label>
                        <select className="input-field" value={ficha.estadoCivil || 'soltero'} onChange={e => sf('estadoCivil', e.target.value)}>
                          <option value="soltero">Soltero/a</option><option value="casado">Casado/a</option>
                          <option value="union_libre">Unión libre</option><option value="divorciado">Divorciado/a</option><option value="viudo">Viudo/a</option>
                        </select></div>
                      <div><label className="label-field">Lugar de nacimiento</label>
                        <input className="input-field" value={ficha.lugarNacimiento || ''} onChange={e => sf('lugarNacimiento', e.target.value)} /></div>
                      <div><label className="label-field">Grupo étnico</label>
                        <input className="input-field" value={ficha.grupoEtnico || ''} onChange={e => sf('grupoEtnico', e.target.value)} /></div>
                      <div><label className="label-field">Escolaridad</label>
                        <input className="input-field" value={ficha.escolaridad || ''} onChange={e => sf('escolaridad', e.target.value)} /></div>
                      <div><label className="label-field">Ocupación</label>
                        <input className="input-field" value={ficha.ocupacion || ''} onChange={e => sf('ocupacion', e.target.value)} /></div>
                      <div><label className="label-field">Religión</label>
                        <input className="input-field" value={ficha.religion || ''} onChange={e => sf('religion', e.target.value)} /></div>
                      <div><label className="label-field">Teléfono</label>
                        <input className="input-field" value={ficha.telefono || ''} onChange={e => sf('telefono', e.target.value)} /></div>
                    </div>
                    <div><label className="label-field">Domicilio</label>
                      <input className="input-field" placeholder="Calle, número, colonia, municipio, estado, CP"
                        value={ficha.domicilio || ''} onChange={e => sf('domicilio', e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="label-field">Contacto de emergencia</label>
                        <input className="input-field" value={ficha.contactoEmergencia || ''} onChange={e => sf('contactoEmergencia', e.target.value)} /></div>
                      <div><label className="label-field">Tel. emergencia</label>
                        <input className="input-field" value={ficha.telefonoEmergencia || ''} onChange={e => sf('telefonoEmergencia', e.target.value)} /></div>
                    </div>
                  </div>
                )}

                {/* ── §6.1.2 Antecedentes heredo-familiares ── */}
                <SectionHeader num="6.1.2" title="Antecedentes heredo-familiares" collapsed={!!collapsed.heredofam} onToggle={() => toggle('heredofam')} />
                {!collapsed.heredofam && (
                  <div className="py-4 space-y-3">
                    <p className="text-xs text-gray-400">Seleccione antecedentes presentes en familiares directos</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {([['diabetes','Diabetes'],['hipertension','Hipertensión'],['cancer','Cáncer'],['cardiopatias','Cardiopatías'],
                        ['enfermedadesMentales','Enf. Mentales'],['alcoholismo','Alcoholismo'],['drogadiccion','Drogadicción'],['epilepsia','Epilepsia'],
                      ] as [keyof AntecedentesHeredoFamiliares, string][]).map(([k,l]) => (
                        <button key={k} type="button" onClick={() => setHeredoFam(p => ({ ...p, [k]: !p[k] }))}
                          className={`p-2.5 rounded-lg text-sm font-medium border transition-colors ${heredoFam[k] ? 'bg-salmon-50 border-salmon-300 text-salmon-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>{l}</button>
                      ))}
                    </div>
                    <div><label className="label-field">Otros</label>
                      <input className="input-field" value={heredoFam.otros || ''} onChange={e => setHeredoFam(p => ({ ...p, otros: e.target.value }))} /></div>
                    <div><label className="label-field">Observaciones</label>
                      <textarea className="input-field h-16 resize-none" value={heredoFam.observaciones || ''}
                        onChange={e => setHeredoFam(p => ({ ...p, observaciones: e.target.value }))} placeholder="Quién, cuándo, estado actual..." /></div>
                  </div>
                )}

                {/* ── §6.1.3 Antecedentes personales patológicos ── */}
                <SectionHeader num="6.1.3" title="Antecedentes personales patológicos" collapsed={!!collapsed.patologicos} onToggle={() => toggle('patologicos')} />
                {!collapsed.patologicos && (
                  <div className="py-4 space-y-3">
                    {([['enfermedadesPrevias','Enfermedades previas'],['hospitalizaciones','Hospitalizaciones'],['cirugias','Cirugías'],
                      ['traumatismos','Traumatismos'],['alergias','Alergias'],['transfusiones','Transfusiones'],
                      ['adicciones','Adicciones'],['medicamentosActuales','Medicamentos actuales'],
                    ] as [keyof AntecedentesPersonalesPatologicos, string][]).map(([k,l]) => (
                      <div key={k}><label className="label-field">{l}</label>
                        <input className="input-field" value={(patologicos[k] as string) || ''}
                          onChange={e => setPatologicos(p => ({ ...p, [k]: e.target.value }))} placeholder={`Describir si aplica...`} /></div>
                    ))}
                  </div>
                )}

                {/* ── §6.1.4 Antecedentes personales no patológicos ── */}
                <SectionHeader num="6.1.4" title="Antecedentes personales no patológicos" collapsed={!!collapsed.nopatologicos} onToggle={() => toggle('nopatologicos')} />
                {!collapsed.nopatologicos && (
                  <div className="py-4 space-y-3">
                    {([['alimentacion','Alimentación'],['habitacion','Vivienda'],['higiene','Higiene'],['tabaquismo','Tabaquismo'],
                      ['alcoholismo','Alcoholismo'],['otrasAdicciones','Otras adicciones'],['actividadFisica','Actividad física'],
                      ['sueno','Patrón de sueño'],['inmunizaciones','Inmunizaciones'],
                    ] as [keyof AntecedentesPersonalesNoPatologicos, string][]).map(([k,l]) => (
                      <div key={k}><label className="label-field">{l}</label>
                        <input className="input-field" value={(noPatologicos[k] as string) || ''}
                          onChange={e => setNoPatologicos(p => ({ ...p, [k]: e.target.value }))} /></div>
                    ))}
                  </div>
                )}

                {/* ── Antecedentes psiquiátricos (específico de especialidad) ── */}
                <SectionHeader num="" title="Antecedentes psiquiátricos" collapsed={!!collapsed.psiquiatricos} onToggle={() => toggle('psiquiatricos')} />
                {!collapsed.psiquiatricos && (
                  <div className="py-4 space-y-3">
                    {([['diagnosticosPrevios','Diagnósticos psiquiátricos previos'],['hospitalizacionesPsiquiatricas','Hospitalizaciones psiquiátricas'],
                      ['intentosSuicidas','Intentos suicidas previos'],['tratamientosPrevios','Tratamientos farmacológicos previos'],
                      ['psicoterapiaPrevia','Psicoterapia previa'],['antecedentesTrauma','Antecedentes de trauma'],['historialViolencia','Historial de violencia'],
                    ] as [keyof AntecedentesPsiquiatricos, string][]).map(([k,l]) => (
                      <div key={k}><label className="label-field">{l}</label>
                        <textarea className="input-field h-14 resize-none" value={(psiquiatricos[k] as string) || ''}
                          onChange={e => setPsiquiatricos(p => ({ ...p, [k]: e.target.value }))} /></div>
                    ))}
                  </div>
                )}

                {/* ── §6.1.5 Padecimiento actual ── */}
                <SectionHeader num="6.1.5" title="Padecimiento actual" collapsed={!!collapsed.padecimiento} onToggle={() => toggle('padecimiento')} />
                {!collapsed.padecimiento && (
                  <div className="py-4">
                    <label className="label-field">Descripción del padecimiento actual <span className="text-red-400">*</span></label>
                    <textarea className="input-field h-40 resize-none" required value={padecimiento} onChange={e => setPadecimiento(e.target.value)}
                      placeholder="Motivo de consulta, inicio de síntomas, evolución, factores desencadenantes, tratamientos previos, estado actual..." />
                  </div>
                )}

                {/* ── §6.1.6 Interrogatorio por aparatos y sistemas ── */}
                <SectionHeader num="6.1.6" title="Interrogatorio por aparatos y sistemas" collapsed={!!collapsed.interrogatorio} onToggle={() => toggle('interrogatorio')} />
                {!collapsed.interrogatorio && (
                  <div className="py-4 space-y-3">
                    {([['cardiovascular','Cardiovascular'],['respiratorio','Respiratorio'],['digestivo','Digestivo'],
                      ['genitourinario','Genitourinario'],['endocrino','Endocrino'],['hematopoyetico','Hematopoyético'],
                      ['nervioso','Sistema nervioso'],['musculoEsqueletico','Músculo-esquelético'],
                      ['pielAnexos','Piel y anexos'],['organosSentidos','Órganos de los sentidos'],
                    ] as [keyof InterrogatorioPorAparatosYSistemas, string][]).map(([k,l]) => (
                      <div key={k}><label className="label-field">{l}</label>
                        <input className="input-field" value={(interrogatorio[k] as string) || ''}
                          onChange={e => setInterrogatorio(p => ({ ...p, [k]: e.target.value }))} placeholder="Sin alteraciones / Describir..." /></div>
                    ))}
                  </div>
                )}

                {/* ── §6.1.7-8 Exploración física y examen mental ── */}
                <SectionHeader num="6.1.7" title="Exploración física, signos vitales y examen mental" collapsed={!!collapsed.exploracion} onToggle={() => toggle('exploracion')} />
                {!collapsed.exploracion && (
                  <div className="py-4 space-y-4">
                    <div><label className="label-field">Exploración física general</label>
                      <textarea className="input-field h-24 resize-none" value={exploracionFisica} onChange={e => setExploracionFisica(e.target.value)}
                        placeholder="Habitus exterior, estado general, inspección, palpación, percusión, auscultación..." /></div>

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Signos vitales</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[{k:'tensionArterial',l:'T/A',p:'120/80'},{k:'frecuenciaCardiaca',l:'FC (lpm)',p:'72'},
                        {k:'frecuenciaRespiratoria',l:'FR (rpm)',p:'16'},{k:'temperatura',l:'Temp (°C)',p:'36.5'},
                        {k:'peso',l:'Peso (kg)',p:'70'},{k:'talla',l:'Talla (cm)',p:'170'},{k:'oximetria',l:'SpO₂ (%)',p:'98'},
                      ].map(({k,l,p}) => (
                        <div key={k}><label className="text-xs text-gray-500 mb-1 block">{l}</label>
                          <input className="input-field text-sm py-1.5" placeholder={p}
                            value={(signosVitales as Record<string, unknown>)[k] as string || ''}
                            onChange={e => setSignosVitales(prev => ({ ...prev, [k]: e.target.value === '' ? undefined : isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value) }))} /></div>
                      ))}
                    </div>

                    <div><label className="label-field">Examen del estado mental</label>
                      <textarea className="input-field h-24 resize-none" value={examenMental} onChange={e => setExamenMental(e.target.value)}
                        placeholder="Apariencia, actitud, psicomotricidad, lenguaje, afecto, pensamiento, percepción, cognición, juicio, introspección..." /></div>

                    <div><label className="label-field">Resultados de estudios previos</label>
                      <textarea className="input-field h-16 resize-none" value={resultadosPrevios} onChange={e => setResultadosPrevios(e.target.value)}
                        placeholder="Laboratorios, gabinete, estudios de imagen previos..." /></div>
                  </div>
                )}

                {/* ── §6.1.10 Diagnósticos ── */}
                <SectionHeader num="6.1.10" title="Diagnósticos CIE-10 y pronóstico" collapsed={!!collapsed.diagnostico} onToggle={() => toggle('diagnostico')} />
                {!collapsed.diagnostico && (
                  <div className="py-4 space-y-3">
                    {diagnosticos.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded p-2 text-sm">
                        <span className="font-mono font-medium text-salmon-700">{d.codigo}</span>
                        <span className="flex-1 text-gray-700">{d.descripcion}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${d.tipo === 'principal' ? 'bg-salmon-100 text-salmon-700' : 'bg-gray-100 text-gray-500'}`}>{d.tipo}</span>
                        <button type="button" onClick={() => setDiagnosticos(diagnosticos.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none">&times;</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-3 gap-2">
                      <input className="input-field text-sm font-mono" placeholder="Código CIE-10 (ej. F32.1)"
                        value={newDiag.codigo} onChange={e => setNewDiag({ ...newDiag, codigo: e.target.value.toUpperCase() })} />
                      <input className="input-field text-sm col-span-2" placeholder="Descripción del diagnóstico"
                        value={newDiag.descripcion} onChange={e => setNewDiag({ ...newDiag, descripcion: e.target.value })} />
                    </div>
                    <div className="flex gap-2">
                      <select className="input-field text-sm flex-1" value={newDiag.tipo}
                        onChange={e => setNewDiag({ ...newDiag, tipo: e.target.value as 'principal' | 'secundario' })}>
                        <option value="principal">Principal</option><option value="secundario">Secundario</option>
                      </select>
                      <button type="button" onClick={addDiag} className="btn-primary text-sm px-4">Agregar</button>
                    </div>
                    <div><label className="label-field">Pronóstico</label>
                      <textarea className="input-field h-16 resize-none" value={pronostico} onChange={e => setPronostico(e.target.value)}
                        placeholder="Pronóstico general del paciente..." /></div>
                  </div>
                )}

                {/* ── §6.1.12 Plan terapéutico ── */}
                <SectionHeader num="6.1.12" title="Plan terapéutico e indicaciones médicas" collapsed={!!collapsed.plan} onToggle={() => toggle('plan')} />
                {!collapsed.plan && (
                  <div className="py-4 space-y-3">
                    <div><label className="label-field">Plan terapéutico</label>
                      <textarea className="input-field h-24 resize-none" value={planTerapeutico} onChange={e => setPlanTerapeutico(e.target.value)}
                        placeholder="Objetivos terapéuticos, tipo de psicoterapia, frecuencia de consultas, referencias a otros servicios..." /></div>

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Indicaciones médicas iniciales</p>
                    {indicaciones.map((m, i) => (
                      <div key={i} className="bg-blue-50 rounded p-2 text-sm flex items-start gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-blue-900">{m.medicamento}</span>
                          <span className="text-blue-700 ml-2">{m.dosis} · {m.via} · {m.frecuencia} · {m.duracion}</span>
                          {m.instrucciones && <p className="text-blue-600 text-xs mt-0.5">{m.instrucciones}</p>}
                        </div>
                        <button type="button" onClick={() => setIndicaciones(indicaciones.filter((_, j) => j !== i))}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none">&times;</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <input className="input-field text-sm" placeholder="Medicamento *" value={newMed.medicamento} onChange={e => setNewMed({ ...newMed, medicamento: e.target.value })} />
                      <input className="input-field text-sm" placeholder="Dosis *" value={newMed.dosis} onChange={e => setNewMed({ ...newMed, dosis: e.target.value })} />
                      <select className="input-field text-sm" value={newMed.via} onChange={e => setNewMed({ ...newMed, via: e.target.value as IndicacionMedica['via'] })}>
                        {VIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <input className="input-field text-sm" placeholder="Frecuencia" value={newMed.frecuencia} onChange={e => setNewMed({ ...newMed, frecuencia: e.target.value })} />
                      <input className="input-field text-sm" placeholder="Duración" value={newMed.duracion} onChange={e => setNewMed({ ...newMed, duracion: e.target.value })} />
                      <input className="input-field text-sm" placeholder="Instrucciones" value={newMed.instrucciones} onChange={e => setNewMed({ ...newMed, instrucciones: e.target.value })} />
                    </div>
                    <button type="button" onClick={addMed} className="text-sm text-salmon-600 hover:text-salmon-700 font-medium">+ Agregar medicamento</button>
                  </div>
                )}
              </div>

              {/* Audit trail (readonly, only when HC exists) */}
              {hc && hc.auditTrail?.length > 0 && (
                <div className="card mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Registro de auditoría</p>
                  <div className="space-y-1">
                    {hc.auditTrail.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 bg-gray-300 rounded-full flex-shrink-0"></span>
                        <span>{new Date(a.fecha).toLocaleString('es-MX')}</span>
                        <span className="text-gray-300">·</span>
                        <span>{a.usuarioNombre}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-600">{a.detalle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save button */}
              <div className="mt-4 space-y-3">
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <span>
                    {isNew
                      ? 'Al guardar, la historia clínica será firmada digitalmente con SHA-256 conforme a NOM-024-SSA3-2012.'
                      : 'Cada modificación queda registrada en la bitácora de auditoría con firma digital actualizada.'}
                    {' '}<strong>Las consultas posteriores se documentan en Notas de Evolución.</strong>
                  </span>
                </div>
                <button onClick={handleSave} disabled={loading || !ficha.nombre || !padecimiento} className="btn-primary w-full">
                  {loading ? 'Guardando...' : isNew ? 'Crear y Firmar Historia Clínica' : 'Actualizar Historia Clínica'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card text-center py-16 text-gray-400">
              <svg className="w-14 h-14 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="font-medium">Selecciona un paciente</p>
              <p className="text-sm mt-1">para crear o consultar su historia clínica</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
