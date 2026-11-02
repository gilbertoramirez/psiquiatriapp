export type UserRole = 'patient' | 'doctor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export interface Patient extends User {
  role: 'patient';
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalHistory?: string;
  accountStatus?: 'pending' | 'active' | 'managed';
  curp?: string;
  notas?: string;               // doctor's internal notes about the patient
  managedByDoctorId?: string;   // set when registered by the doctor without a digital account
}

export interface Invitation {
  id: string;
  token: string;
  patientId: string;
  doctorId: string;
  email: string;
  status: 'pending' | 'accepted';
  createdAt: string;
  acceptedAt?: string;
}

export interface Doctor extends User {
  role: 'doctor';
  specialty: string;
  licenseNumber: string;
  consultationFee: number;
  availableHours: AvailableHours;
  address?: string;
  modalityByDay?: { [day: string]: 'in-person' | 'online' | 'both' };
}

export interface AvailableHours {
  [day: string]: { start: string; end: string }[];
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  type: 'initial' | 'followup' | 'emergency';
  modality: 'in-person' | 'online';
  notes?: string;
  patientName?: string;
  doctorName?: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  amount: number;
  meetLink?: string;
  cancelledAt?: string;
  cancelReason?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  date: string;
  medications: Medication[];
  diagnosis: string;
  notes?: string;
  doctorName?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Recommendation {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  title: string;
  description: string;
  steps: RecommendationStep[];
  category: 'exercise' | 'diet' | 'therapy' | 'lifestyle' | 'medication' | 'other';
  priority: 'low' | 'medium' | 'high';
  doctorName?: string;
}

export interface RecommendationStep {
  order: number;
  description: string;
  completed: boolean;
}

// NOM-024-SSA3-2012 / NOM-004-SSA3-2012 clinical record types
export interface SignosVitales {
  tensionArterial?: string;        // ej. "120/80"
  frecuenciaCardiaca?: number;     // lpm
  frecuenciaRespiratoria?: number; // rpm
  temperatura?: number;            // °C
  peso?: number;                   // kg
  talla?: number;                  // cm
  imc?: number;
  oximetria?: number;              // SpO2 %
}

export interface DiagnosticoCIE10 {
  codigo: string;       // ej. "F32.1"
  descripcion: string;  // ej. "Episodio depresivo moderado"
  tipo: 'principal' | 'secundario';
}

export interface IndicacionMedica {
  medicamento: string;
  dosis: string;
  via: 'oral' | 'sublingual' | 'intramuscular' | 'intravenosa' | 'topica' | 'otra';
  frecuencia: string;
  duracion: string;
  instrucciones?: string;
}

export interface AuditEntry {
  accion: 'creacion' | 'addendum';
  usuario: string;
  usuarioNombre: string;
  fecha: string;        // ISO timestamp
  detalle?: string;
}

export type NivelRiesgo = 'nulo' | 'bajo' | 'moderado' | 'alto';

// Nota de Evolución (NOM-004-SSA3-2012 §6.2).
// Older bitácora entries only have the base fields (mood, notes, treatment, soapNotes).
export interface PatientLog {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  appointmentId?: string;
  mood: number;
  symptoms: string[];
  notes: string;
  treatment: string;
  progress: 'improving' | 'stable' | 'declining';
  soapNotes?: { subjective?: string; objective?: string; assessment?: string; plan?: string };

  doctorNombre?: string;
  doctorCedula?: string;
  motivoConsulta?: string;
  evolucionClinica?: string;
  exploracionFisica?: string;
  examenMental?: string;
  riesgoSuicida?: NivelRiesgo;
  riesgoViolencia?: NivelRiesgo;
  consumoSustancias?: string;
  signosVitales?: SignosVitales;
  resultadosEstudios?: string;
  diagnosticos?: DiagnosticoCIE10[];
  pronostico?: 'favorable' | 'reservado' | 'desfavorable';
  indicaciones?: IndicacionMedica[];
  proximaCita?: string;

  firmaDigital?: string;
  auditTrail?: AuditEntry[];
  addendums?: { fecha: string; contenido: string; usuario: string }[];
  bloqueado?: boolean;
}

// Historia Clínica (NOM-004-SSA3-2012 §6.1)
export interface FichaIdentificacion {
  curp?: string;
  nombre: string;
  edad: number;
  sexo: 'masculino' | 'femenino' | 'otro';
  fechaNacimiento: string;
  lugarNacimiento?: string;
  estadoCivil?: 'soltero' | 'casado' | 'union_libre' | 'divorciado' | 'viudo';
  escolaridad?: string;
  ocupacion?: string;
  religion?: string;
  grupoEtnico?: string;
  domicilio?: string;
  telefono?: string;
  contactoEmergencia?: string;
  telefonoEmergencia?: string;
}

export interface AntecedentesHeredoFamiliares {
  diabetes?: boolean;
  hipertension?: boolean;
  cancer?: boolean;
  cardiopatias?: boolean;
  enfermedadesMentales?: boolean;
  alcoholismo?: boolean;
  drogadiccion?: boolean;
  epilepsia?: boolean;
  otros?: string;
  observaciones?: string;
}

export interface AntecedentesPersonalesPatologicos {
  enfermedadesPrevias?: string;
  hospitalizaciones?: string;
  cirugias?: string;
  traumatismos?: string;
  alergias?: string;
  transfusiones?: string;
  adicciones?: string;
  medicamentosActuales?: string;
}

export interface AntecedentesPersonalesNoPatologicos {
  alimentacion?: string;
  habitacion?: string;
  higiene?: string;
  tabaquismo?: string;
  alcoholismo?: string;
  otrasAdicciones?: string;
  actividadFisica?: string;
  sueno?: string;
  inmunizaciones?: string;
}

export interface AntecedentesPsiquiatricos {
  diagnosticosPrevios?: string;
  hospitalizacionesPsiquiatricas?: string;
  intentosSuicidas?: string;
  tratamientosPrevios?: string;
  psicoterapiaPrevia?: string;
  antecedentesTrauma?: string;
  historialViolencia?: string;
}

export interface InterrogatorioPorAparatosYSistemas {
  cardiovascular?: string;
  respiratorio?: string;
  digestivo?: string;
  genitourinario?: string;
  endocrino?: string;
  hematopoyetico?: string;
  nervioso?: string;
  musculoEsqueletico?: string;
  pielAnexos?: string;
  organosSentidos?: string;
}

export interface HistoriaClinica {
  id: string;
  patientId: string;
  doctorId: string;
  doctorNombre: string;
  doctorCedula: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  fichaIdentificacion: FichaIdentificacion;
  antecedentesHeredoFamiliares: AntecedentesHeredoFamiliares;
  antecedentesPersonalesPatologicos: AntecedentesPersonalesPatologicos;
  antecedentesPersonalesNoPatologicos: AntecedentesPersonalesNoPatologicos;
  antecedentesPsiquiatricos: AntecedentesPsiquiatricos;
  padecimientoActual: string;
  interrogatorio: InterrogatorioPorAparatosYSistemas;
  exploracionFisica: string;
  signosVitales: SignosVitales;
  examenMental: string;
  resultadosEstudiosPrevios?: string;
  diagnosticos: DiagnosticoCIE10[];
  pronostico: string;
  planTerapeutico: string;
  indicacionesIniciales: IndicacionMedica[];
  firmaDigital: string;
  auditTrail: AuditEntry[];
  bloqueado: boolean;
}

export interface PatientCheckIn {
  id: string;
  patientId: string;
  date: string;
  mood: number;
  sleep: number;
  sleepQuality: number;
  anxiety: number;
  energy: number;
  sideEffects?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  appointmentId: string;
  patientId: string;
  amount: number;
  method: 'card' | 'transfer' | 'cash';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  date: string;
  reference?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DashboardStats {
  totalPatients: number;
  todayAppointments: number;
  weekAppointments: number;
  pendingPayments: number;
  completedToday: number;
}

export interface BlogPost {
  id: string;
  doctorId: string;
  doctorName: string;
  title: string;
  content: string;
  excerpt: string;
  category: 'research' | 'wellness' | 'medication' | 'therapy' | 'news';
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  published: boolean;
  comments: BlogComment[];
}

export interface AppNotification {
  id: string;
  userId: string;
  userRole: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ClinicalQuestionnaire {
  id: string;
  patientId: string;
  type: 'PHQ9' | 'GAD7';
  date: string;
  answers: number[];
  score: number;
  severity: string;
}

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}
