'use client';

import { useState, useEffect, useCallback } from 'react';
import { historiaClinica as hcApi, patients as patientsApi } from '@/lib/api';
import {
  Patient, HistoriaClinica, DiagnosticoCIE10, IndicacionMedica,
  FichaIdentificacion, AntecedentesHeredoFamiliares,
  AntecedentesPersonalesPatologicos, AntecedentesPersonalesNoPatologicos,
  AntecedentesPsiquiatricos, InterrogatorioPorAparatosYSistemas, SignosVitales,
} from '@/types';

type Tab = 'ficha' | 'heredofam' | 'patologicos' | 'nopatologicos' | 'psiquiatricos' | 'padecimiento' | 'interrogatorio' | 'exploracion' | 'diagnostico' | 'plan';

const TABS: { key: Tab; label: string; ref: string }[] = [
  { key: 'ficha', label: 'Identificación', ref: '6.1.1' },
  { key: 'heredofam', label: 'Heredo-Familiares', ref: '6.1.2' },
  { key: 'patologicos', label: 'Patológicos', ref: '6.1.3' },
  { key: 'nopatologicos', label: 'No Patológicos', ref: '6.1.4' },
  { key: 'psiquiatricos', label: 'Psiquiátricos', ref: '' },
  { key: 'padecimiento', label: 'Padecimiento Actual', ref: '6.1.5' },
  { key: 'interrogatorio', label: 'Interrogatorio', ref: '6.1.6' },
  { key: 'exploracion', label: 'Exploración Física', ref: '6.1.7' },
  { key: 'diagnostico', label: 'Diagnósticos', ref: '6.1.10' },
  { key: 'plan', label: 'Plan Terapéutico', ref: '6.1.12' },
];

const VIA_OPTIONS = ['oral', 'sublingual', 'intramuscular', 'intravenosa', 'topica', 'otra'] as const;

const emptyFicha = (): FichaIdentificacion => ({
  nombre: '', edad: 0, sexo: 'masculino', fechaNacimiento: '',
});

const emptyHeredoFam = (): AntecedentesHeredoFamiliares => ({
  diabetes: false, hipertension: false, cancer: false, cardiopatias: false,
  enfermedadesMentales: false, alcoholismo: false, drogadiccion: false, epilepsia: false,
});

export default function ExpedientePage() {
  const [patientList, setPatientList] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [hc, setHc] = useState<HistoriaClinica | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tab, setTab] = useState<Tab>('ficha');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
      } else {
        setHc(null); setIsNew(true); resetForm();
        setFicha(prev => ({ ...prev, nombre: patient.name }));
      }
    } catch {
      setHc(null); setIsNew(true); resetForm();
      setFicha(prev => ({ ...prev, nombre: patient.name }));
    }
  }, [resetForm]);

  useEffect(() => { if (selectedPatient) loadHC(selectedPatient); }, [selectedPatient, loadHC]);

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
    if (!padecimiento) { setMessage({ type: 'error', text: 'El padecimiento actual es obligatorio (NOM-004 §6.1.5)' }); setTab('padecimiento'); return; }

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

  const sf = (field: string, value: unknown) => setFicha(prev => ({ ...prev, [field]: value }));

  const renderTab = () => {
    switch (tab) {
      case 'ficha': return (
        <div className="space-y-3">
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
              <select className="input-field" value={ficha.estadoCivil || ''} onChange={e => sf('estadoCivil', e.target.value)}>
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
      );

      case 'heredofam': return (
        <div className="space-y-4">
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
            <textarea className="input-field h-20 resize-none" value={heredoFam.observaciones || ''}
              onChange={e => setHeredoFam(p => ({ ...p, observaciones: e.target.value }))} placeholder="Quién, cuándo, estado actual..." /></div>
        </div>
      );

      case 'patologicos': return (
        <div className="space-y-3">
          {(['enfermedadesPrevias','hospitalizaciones','cirugias','traumatismos','alergias','transfusiones','adicciones','medicamentosActuales'] as const).map(k => (
            <div key={k}><label className="label-field capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</label>
              <input className="input-field" value={(patologicos[k] as string) || ''} onChange={e => setPatologicos(p => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
        </div>
      );

      case 'nopatologicos': return (
        <div className="space-y-3">
          {([['alimentacion','Alimentación'],['habitacion','Vivienda'],['higiene','Higiene'],['tabaquismo','Tabaquismo'],
            ['alcoholismo','Alcoholismo'],['otrasAdicciones','Otras adicciones'],['actividadFisica','Actividad física'],
            ['sueno','Patrón de sueño'],['inmunizaciones','Inmunizaciones'],
          ] as [keyof AntecedentesPersonalesNoPatologicos, string][]).map(([k,l]) => (
            <div key={k}><label className="label-field">{l}</label>
              <input className="input-field" value={(noPatologicos[k] as string) || ''} onChange={e => setNoPatologicos(p => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
        </div>
      );

      case 'psiquiatricos': return (
        <div className="space-y-3">
          {([['diagnosticosPrevios','Diagnósticos previos'],['hospitalizacionesPsiquiatricas','Hospitalizaciones psiquiátricas'],
            ['intentosSuicidas','Intentos suicidas'],['tratamientosPrevios','Tratamientos farmacológicos previos'],
            ['psicoterapiaPrevia','Psicoterapia previa'],['antecedentesTrauma','Antecedentes de trauma'],['historialViolencia','Historial de violencia'],
          ] as [keyof AntecedentesPsiquiatricos, string][]).map(([k,l]) => (
            <div key={k}><label className="label-field">{l}</label>
              <textarea className="input-field h-16 resize-none" value={(psiquiatricos[k] as string) || ''}
                onChange={e => setPsiquiatricos(p => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
        </div>
      );

      case 'padecimiento': return (
        <div><label className="label-field">Padecimiento actual <span className="text-red-400">*</span></label>
          <textarea className="input-field h-48 resize-none" value={padecimiento} onChange={e => setPadecimiento(e.target.value)}
            placeholder="Motivo de consulta, inicio de síntomas, evolución, factores desencadenantes, tratamientos previos, estado actual..." /></div>
      );

      case 'interrogatorio': return (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Revisión por aparatos y sistemas</p>
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
      );

      case 'exploracion': return (
        <div className="space-y-4">
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
      );

      case 'diagnostico': return (
        <div className="space-y-4">
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
            <input className="input-field text-sm font-mono" placeholder="Código CIE-10"
              value={newDiag.codigo} onChange={e => setNewDiag({ ...newDiag, codigo: e.target.value.toUpperCase() })} />
            <input className="input-field text-sm col-span-2" placeholder="Descripción"
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
            <textarea className="input-field h-16 resize-none" value={pronostico} onChange={e => setPronostico(e.target.value)} /></div>
        </div>
      );

      case 'plan': return (
        <div className="space-y-4">
          <div><label className="label-field">Plan terapéutico</label>
            <textarea className="input-field h-24 resize-none" value={planTerapeutico} onChange={e => setPlanTerapeutico(e.target.value)}
              placeholder="Objetivos terapéuticos, tipo de psicoterapia, frecuencia de consultas, referencias..." /></div>
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
      );
    }
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
        <div className="card h-fit">
          <h2 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wide">Pacientes</h2>
          {patientList.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Los pacientes aparecerán una vez agenden cita.</p>
          ) : (
            <div className="space-y-1">
              {patientList.map(p => (
                <button key={p.id} onClick={() => { setSelectedPatient(p); setTab('ficha'); setMessage({ type: '', text: '' }); }}
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

        <div className="lg:col-span-3">
          {selectedPatient ? (
            <>
              <div className="card mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedPatient.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {hc ? <>Creada {new Date(hc.fechaCreacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} · {hc.auditTrail?.length || 0} registro(s) de auditoría</>
                      : 'Sin historia clínica — crear nueva'}
                  </p>
                </div>
                {hc && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    <span>Firmada · {hc.firmaDigital?.slice(0, 12)}...</span>
                  </div>
                )}
              </div>

              <div className="mb-4 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${tab === t.key ? 'bg-salmon-50 text-salmon-700 ring-1 ring-salmon-200' : 'text-gray-500 hover:bg-gray-50'}`}>
                      {t.ref && <span className="text-gray-400 mr-1">§{t.ref}</span>}{t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {TABS.find(t => t.key === tab)?.ref ? `§ ${TABS.find(t => t.key === tab)?.ref} — ` : ''}{TABS.find(t => t.key === tab)?.label}
                  </p>
                  {!isNew && hc && <span className="text-xs text-gray-400">Actualizado: {new Date(hc.fechaActualizacion).toLocaleString('es-MX')}</span>}
                </div>
                {renderTab()}
              </div>

              <div className="mt-4 space-y-3">
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <span>Firmada digitalmente con SHA-256 conforme a <strong>NOM-024-SSA3-2012</strong>. Cada modificación queda en la bitácora de auditoría.</span>
                </div>
                <button onClick={handleSave} disabled={loading || !ficha.nombre || !padecimiento} className="btn-primary w-full">
                  {loading ? 'Guardando...' : isNew ? 'Crear y Firmar Historia Clínica' : 'Actualizar Historia Clínica'}
                </button>
              </div>
            </>
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
