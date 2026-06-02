'use client';

import { useState, useEffect, useCallback } from 'react';
import { historiaClinica as hcApi, patients as patientsApi, auth } from '@/lib/api';
import { HistoriaClinica, PatientLog } from '@/types';

type View = 'historia' | 'notas';

const moodEmojis = ['😞', '😔', '😐', '🙂', '😊'];
const progressLabels: Record<string, string> = { improving: 'Mejorando', stable: 'Estable', declining: 'Declinando' };
const progressColors: Record<string, string> = { improving: 'bg-green-100 text-green-800', stable: 'bg-blue-100 text-blue-800', declining: 'bg-red-100 text-red-800' };

export default function PacienteExpedientePage() {
  const [view, setView] = useState<View>('historia');
  const [hc, setHc] = useState<HistoriaClinica | null>(null);
  const [logs, setLogs] = useState<PatientLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [loadingHc, setLoadingHc] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const user = auth.getUser();

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoadingHc(true);
      const data = await hcApi.get(user.id);
      setHc(data);
    } catch { /* ignore */ }
    setLoadingHc(false);

    try {
      setLoadingLogs(true);
      const data = await patientsApi.myLogs();
      setLogs(data);
    } catch { /* ignore */ }
    setLoadingLogs(false);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      {children}
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | number | null }) => {
    if (!value) return null;
    return (
      <div className="flex items-baseline gap-2 py-1">
        <span className="text-xs text-gray-400 w-36 flex-shrink-0">{label}</span>
        <span className="text-sm text-gray-700">{value}</span>
      </div>
    );
  };

  const BoolField = ({ label, value }: { label: string; value?: boolean }) => (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${value ? 'bg-salmon-50 border-salmon-200 text-salmon-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
      {label}
    </span>
  );

  const renderHistoria = () => {
    if (loadingHc) return <div className="card text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-salmon-400 border-t-transparent rounded-full mx-auto"></div></div>;
    if (!hc) return (
      <div className="card text-center py-12 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <p className="font-medium">No se ha creado tu historia clínica aún</p>
        <p className="text-sm mt-1">Tu médico la creará durante tu primera consulta</p>
      </div>
    );

    const f = hc.fichaIdentificacion;
    const ahf = hc.antecedentesHeredoFamiliares;
    const app = hc.antecedentesPersonalesPatologicos;
    const apnp = hc.antecedentesPersonalesNoPatologicos;
    const apsiq = hc.antecedentesPsiquiatricos;
    const interr = hc.interrogatorio;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="card bg-gradient-to-r from-salmon-50 to-white border-l-4 border-l-salmon-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{f.nombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Creada {new Date(hc.fechaCreacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                {' · '}Dr(a). {hc.doctorNombre}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span>Firmada digitalmente</span>
            </div>
          </div>
        </div>

        {/* Ficha de identificación */}
        <div className="card">
          <Section title="Ficha de identificación">
            <div className="grid sm:grid-cols-2 gap-x-6">
              <Field label="CURP" value={f.curp} />
              <Field label="Edad" value={f.edad ? `${f.edad} años` : undefined} />
              <Field label="Sexo" value={f.sexo} />
              <Field label="Fecha de nacimiento" value={f.fechaNacimiento ? new Date(f.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : undefined} />
              <Field label="Estado civil" value={f.estadoCivil?.replace('_', ' ')} />
              <Field label="Escolaridad" value={f.escolaridad} />
              <Field label="Ocupación" value={f.ocupacion} />
              <Field label="Lugar de nacimiento" value={f.lugarNacimiento} />
              <Field label="Grupo étnico" value={f.grupoEtnico} />
              <Field label="Religión" value={f.religion} />
              <Field label="Domicilio" value={f.domicilio} />
              <Field label="Teléfono" value={f.telefono} />
              <Field label="Contacto emergencia" value={f.contactoEmergencia} />
              <Field label="Tel. emergencia" value={f.telefonoEmergencia} />
            </div>
          </Section>
        </div>

        {/* Antecedentes heredo-familiares */}
        {ahf && Object.values(ahf).some(v => v) && (
          <div className="card">
            <Section title="Antecedentes heredo-familiares">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <BoolField label="Diabetes" value={ahf.diabetes} />
                <BoolField label="Hipertensión" value={ahf.hipertension} />
                <BoolField label="Cáncer" value={ahf.cancer} />
                <BoolField label="Cardiopatías" value={ahf.cardiopatias} />
                <BoolField label="Enf. mentales" value={ahf.enfermedadesMentales} />
                <BoolField label="Alcoholismo" value={ahf.alcoholismo} />
                <BoolField label="Drogadicción" value={ahf.drogadiccion} />
                <BoolField label="Epilepsia" value={ahf.epilepsia} />
              </div>
              {ahf.otros && <Field label="Otros" value={ahf.otros} />}
              {ahf.observaciones && <Field label="Observaciones" value={ahf.observaciones} />}
            </Section>
          </div>
        )}

        {/* Antecedentes personales patológicos */}
        {app && Object.values(app).some(v => v) && (
          <div className="card">
            <Section title="Antecedentes personales patológicos">
              <div className="grid sm:grid-cols-2 gap-x-6">
                <Field label="Enfermedades previas" value={app.enfermedadesPrevias} />
                <Field label="Hospitalizaciones" value={app.hospitalizaciones} />
                <Field label="Cirugías" value={app.cirugias} />
                <Field label="Traumatismos" value={app.traumatismos} />
                <Field label="Alergias" value={app.alergias} />
                <Field label="Transfusiones" value={app.transfusiones} />
                <Field label="Adicciones" value={app.adicciones} />
                <Field label="Medicamentos" value={app.medicamentosActuales} />
              </div>
            </Section>
          </div>
        )}

        {/* Antecedentes no patológicos */}
        {apnp && Object.values(apnp).some(v => v) && (
          <div className="card">
            <Section title="Antecedentes personales no patológicos">
              <div className="grid sm:grid-cols-2 gap-x-6">
                <Field label="Alimentación" value={apnp.alimentacion} />
                <Field label="Vivienda" value={apnp.habitacion} />
                <Field label="Higiene" value={apnp.higiene} />
                <Field label="Tabaquismo" value={apnp.tabaquismo} />
                <Field label="Alcoholismo" value={apnp.alcoholismo} />
                <Field label="Otras adicciones" value={apnp.otrasAdicciones} />
                <Field label="Actividad física" value={apnp.actividadFisica} />
                <Field label="Sueño" value={apnp.sueno} />
                <Field label="Inmunizaciones" value={apnp.inmunizaciones} />
              </div>
            </Section>
          </div>
        )}

        {/* Antecedentes psiquiátricos */}
        {apsiq && Object.values(apsiq).some(v => v) && (
          <div className="card">
            <Section title="Antecedentes psiquiátricos">
              <Field label="Diagnósticos previos" value={apsiq.diagnosticosPrevios} />
              <Field label="Hospitalizaciones" value={apsiq.hospitalizacionesPsiquiatricas} />
              <Field label="Intentos suicidas" value={apsiq.intentosSuicidas} />
              <Field label="Tratamientos previos" value={apsiq.tratamientosPrevios} />
              <Field label="Psicoterapia previa" value={apsiq.psicoterapiaPrevia} />
              <Field label="Antecedentes trauma" value={apsiq.antecedentesTrauma} />
              <Field label="Historial violencia" value={apsiq.historialViolencia} />
            </Section>
          </div>
        )}

        {/* Padecimiento actual */}
        {hc.padecimientoActual && (
          <div className="card">
            <Section title="Padecimiento actual">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{hc.padecimientoActual}</p>
            </Section>
          </div>
        )}

        {/* Interrogatorio por aparatos y sistemas */}
        {interr && Object.values(interr).some(v => v) && (
          <div className="card">
            <Section title="Interrogatorio por aparatos y sistemas">
              <div className="grid sm:grid-cols-2 gap-x-6">
                <Field label="Cardiovascular" value={interr.cardiovascular} />
                <Field label="Respiratorio" value={interr.respiratorio} />
                <Field label="Digestivo" value={interr.digestivo} />
                <Field label="Genitourinario" value={interr.genitourinario} />
                <Field label="Endocrino" value={interr.endocrino} />
                <Field label="Hematopoyético" value={interr.hematopoyetico} />
                <Field label="Nervioso" value={interr.nervioso} />
                <Field label="Músculo-esquelético" value={interr.musculoEsqueletico} />
                <Field label="Piel y anexos" value={interr.pielAnexos} />
                <Field label="Órganos sentidos" value={interr.organosSentidos} />
              </div>
            </Section>
          </div>
        )}

        {/* Exploración física y signos vitales */}
        {(hc.exploracionFisica || hc.examenMental || (hc.signosVitales && Object.values(hc.signosVitales).some(v => v))) && (
          <div className="card">
            {hc.exploracionFisica && (
              <Section title="Exploración física">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{hc.exploracionFisica}</p>
              </Section>
            )}
            {hc.signosVitales && Object.values(hc.signosVitales).some(v => v) && (
              <Section title="Signos vitales iniciales">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                  {hc.signosVitales.tensionArterial && <span className="bg-gray-50 rounded p-2">T/A: <strong>{hc.signosVitales.tensionArterial}</strong></span>}
                  {hc.signosVitales.frecuenciaCardiaca && <span className="bg-gray-50 rounded p-2">FC: <strong>{hc.signosVitales.frecuenciaCardiaca} lpm</strong></span>}
                  {hc.signosVitales.frecuenciaRespiratoria && <span className="bg-gray-50 rounded p-2">FR: <strong>{hc.signosVitales.frecuenciaRespiratoria} rpm</strong></span>}
                  {hc.signosVitales.temperatura && <span className="bg-gray-50 rounded p-2">Temp: <strong>{hc.signosVitales.temperatura}°C</strong></span>}
                  {hc.signosVitales.peso && <span className="bg-gray-50 rounded p-2">Peso: <strong>{hc.signosVitales.peso} kg</strong></span>}
                  {hc.signosVitales.talla && <span className="bg-gray-50 rounded p-2">Talla: <strong>{hc.signosVitales.talla} cm</strong></span>}
                  {hc.signosVitales.oximetria && <span className="bg-gray-50 rounded p-2">SpO₂: <strong>{hc.signosVitales.oximetria}%</strong></span>}
                </div>
              </Section>
            )}
            {hc.examenMental && (
              <Section title="Examen del estado mental">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{hc.examenMental}</p>
              </Section>
            )}
          </div>
        )}

        {/* Diagnósticos */}
        {hc.diagnosticos?.length > 0 && (
          <div className="card">
            <Section title="Diagnósticos CIE-10">
              {hc.diagnosticos.map((d, i) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <span className="font-mono font-medium text-salmon-600 text-sm">{d.codigo}</span>
                  <span className="text-sm text-gray-700">{d.descripcion}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${d.tipo === 'principal' ? 'bg-salmon-100 text-salmon-700' : 'bg-gray-100 text-gray-500'}`}>{d.tipo}</span>
                </div>
              ))}
            </Section>
            {hc.pronostico && <Field label="Pronóstico" value={hc.pronostico} />}
          </div>
        )}

        {/* Plan terapéutico */}
        {(hc.planTerapeutico || hc.indicacionesIniciales?.length > 0) && (
          <div className="card">
            {hc.planTerapeutico && (
              <Section title="Plan terapéutico">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{hc.planTerapeutico}</p>
              </Section>
            )}
            {hc.indicacionesIniciales?.length > 0 && (
              <Section title="Indicaciones médicas iniciales">
                {hc.indicacionesIniciales.map((m, i) => (
                  <div key={i} className="bg-blue-50 rounded p-2 text-xs mb-1">
                    <span className="font-medium text-blue-900">{m.medicamento}</span>
                    <span className="text-blue-700 ml-2">{m.dosis} · {m.via} · {m.frecuencia} · {m.duracion}</span>
                    {m.instrucciones && <p className="text-blue-600 mt-0.5">{m.instrucciones}</p>}
                  </div>
                ))}
              </Section>
            )}
          </div>
        )}

        {/* Audit trail */}
        {hc.auditTrail?.length > 0 && (
          <div className="card">
            <Section title="Registro de auditoría">
              <div className="space-y-1.5">
                {hc.auditTrail.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0"></span>
                    <span>{new Date(a.fecha).toLocaleString('es-MX')}</span>
                    <span className="text-gray-400">·</span>
                    <span>{a.usuarioNombre}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-600">{a.detalle}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    );
  };

  const renderNotas = () => {
    if (loadingLogs) return <div className="card text-center py-12"><div className="animate-spin w-6 h-6 border-2 border-salmon-400 border-t-transparent rounded-full mx-auto"></div></div>;
    if (logs.length === 0) return (
      <div className="card text-center py-12 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        <p className="font-medium">No hay notas de evolución aún</p>
        <p className="text-sm mt-1">Aparecerán aquí después de tus consultas</p>
      </div>
    );

    return (
      <div className="space-y-3">
        {logs.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
          <div key={log.id} className="card">
            <button className="w-full text-left" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{moodEmojis[Math.min(Math.floor(log.mood / 2.5), 4)]}</span>
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      {log.diagnosticos?.[0]?.codigo && <span className="font-mono text-salmon-600 mr-2">{log.diagnosticos[0].codigo}</span>}
                      {log.diagnosticos?.[0]?.descripcion || 'Nota de evolución'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                      {' · '}{log.doctorNombre}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${progressColors[log.progress]}`}>{progressLabels[log.progress]}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expandedLog === log.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </button>

            {expandedLog === log.id && (
              <div className="mt-4 space-y-3 border-t pt-4">
                {log.motivoConsulta && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Motivo de consulta</p>
                    <p className="text-sm text-gray-700">{log.motivoConsulta}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Evolución clínica</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{log.evolucionClinica}</p>
                </div>
                {log.symptoms?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Síntomas</p>
                    <div className="flex flex-wrap gap-1">
                      {log.symptoms.map(s => <span key={s} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{s}</span>)}
                    </div>
                  </div>
                )}

                {log.signosVitales && Object.values(log.signosVitales).some(v => v) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Signos vitales</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {log.signosVitales.tensionArterial && <span className="bg-gray-50 rounded p-1.5">T/A: <strong>{log.signosVitales.tensionArterial}</strong></span>}
                      {log.signosVitales.frecuenciaCardiaca && <span className="bg-gray-50 rounded p-1.5">FC: <strong>{log.signosVitales.frecuenciaCardiaca} lpm</strong></span>}
                      {log.signosVitales.peso && <span className="bg-gray-50 rounded p-1.5">Peso: <strong>{log.signosVitales.peso} kg</strong></span>}
                    </div>
                  </div>
                )}

                {log.diagnosticos?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Diagnósticos</p>
                    {log.diagnosticos.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-mono font-medium text-salmon-600">{d.codigo}</span>
                        <span className="text-gray-700">{d.descripcion}</span>
                      </div>
                    ))}
                  </div>
                )}

                {log.indicaciones?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Indicaciones médicas</p>
                    {log.indicaciones.map((m, i) => (
                      <div key={i} className="bg-blue-50 rounded p-2 text-xs mb-1">
                        <span className="font-medium text-blue-900">{m.medicamento}</span>
                        <span className="text-blue-700 ml-2">{m.dosis} · {m.via} · {m.frecuencia} · {m.duracion}</span>
                      </div>
                    ))}
                  </div>
                )}

                {log.treatment && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Plan terapéutico</p>
                    <p className="text-sm text-gray-700">{log.treatment}</p>
                  </div>
                )}

                {log.addendums?.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Addendums</p>
                    {log.addendums.map((a, i) => (
                      <div key={i} className="bg-yellow-50 border border-yellow-100 rounded p-2 text-xs mb-1">
                        <p className="text-yellow-700">{a.contenido}</p>
                        <p className="text-yellow-500 mt-0.5">{a.usuario} · {new Date(a.fecha).toLocaleDateString('es-MX')}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-xs text-green-600 border-t pt-3">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <span>Firmado digitalmente · {log.firmaDigital?.slice(0, 16)}…</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Expediente Clínico</h1>
        <p className="text-gray-500 text-sm mt-1">Consulta tu historia clínica y notas de evolución</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        <button onClick={() => setView('historia')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'historia' ? 'bg-salmon-50 text-salmon-700 ring-1 ring-salmon-200' : 'text-gray-500 hover:bg-gray-50'}`}>
          Historia Clínica
        </button>
        <button onClick={() => setView('notas')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${view === 'notas' ? 'bg-salmon-50 text-salmon-700 ring-1 ring-salmon-200' : 'text-gray-500 hover:bg-gray-50'}`}>
          Notas de Evolución ({logs.length})
        </button>
      </div>

      {view === 'historia' ? renderHistoria() : renderNotas()}
    </div>
  );
}
