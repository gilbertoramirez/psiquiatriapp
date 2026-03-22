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
}

export interface Doctor extends User {
  role: 'doctor';
  specialty: string;
  licenseNumber: string;
  consultationFee: number;
  availableHours: AvailableHours;
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
  notes?: string;
  patientName?: string;
  doctorName?: string;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  amount: number;
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

// NOM-024-SSA3-2012 / NOM-004-SSA3-2012 compliant clinical note
export interface SignosVitales {
  tensionArterial?: string;        // ej. "120/80"
  frecuenciaCardiaca?: number;     // lpm
  frecuenciaRespiratoria?: number; // rpm
  temperatura?: number;            // °C
  peso?: number;                   // kg
  talla?: number;                  // cm
  imc?: number;                    // calculado
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
  frecuencia: string;   // ej. "Cada 8 horas"
  duracion: string;     // ej. "14 días"
  instrucciones?: string;
}

export interface AuditEntry {
  accion: 'creacion' | 'addendum';
  usuario: string;
  usuarioNombre: string;
  fecha: string;        // ISO timestamp
  detalle?: string;
}

// Nota de Evolución (NOM-004-SSA3-2012 numeral 6.2)
export interface PatientLog {
  id: string;
  patientId: string;
  doctorId: string;
  doctorNombre: string;
  doctorCedula: string;
  date: string;
  appointmentId?: string;

  // 6.2.1 Evolución del cuadro clínico
  motivoConsulta: string;
  evolucionClinica: string;
  exploracionFisica: string;

  // Evaluación psiquiátrica
  mood: number;                     // Estado de ánimo 1-10
  symptoms: string[];               // Síntomas observados
  examenMental: string;             // Examen del estado mental
  riesgoSuicida: 'nulo' | 'bajo' | 'moderado' | 'alto';
  riesgoViolencia: 'nulo' | 'bajo' | 'moderado' | 'alto';
  consumoSustancias?: string;

  // 6.2.2 Signos vitales
  signosVitales: SignosVitales;

  // 6.2.3 Resultados de estudios auxiliares
  resultadosEstudios?: string;

  // Diagnóstico con CIE-10
  diagnosticos: DiagnosticoCIE10[];

  // Pronóstico
  pronostico: 'favorable' | 'reservado' | 'desfavorable';
  progress: 'improving' | 'stable' | 'declining';

  // 6.2.6 Tratamiento e indicaciones médicas
  indicaciones: IndicacionMedica[];
  treatment: string;                // Plan terapéutico general
  proximaCita?: string;

  // NOM-024: Auditoría e integridad
  firmaDigital: string;             // Hash de integridad
  auditTrail: AuditEntry[];
  addendums: { fecha: string; contenido: string; usuario: string }[];
  bloqueado: boolean;               // Inmutable una vez firmado
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

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: string;
}
