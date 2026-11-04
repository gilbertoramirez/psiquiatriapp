import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export type Sql = NeonQueryFunction<false, false>;
export type Row = Record<string, unknown>;

let _sql: Sql | null = null;

export function getSql(): Sql | null {
  if (!process.env.DATABASE_URL) return null;
  if (!_sql) _sql = neon(process.env.DATABASE_URL) as Sql;
  return _sql;
}

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  created_at TEXT NOT NULL,
  date_of_birth TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  curp TEXT,
  medical_history TEXT,
  creado_por_doctor BOOLEAN DEFAULT FALSE,
  sin_cuenta_digital BOOLEAN DEFAULT FALSE,
  doctor_id TEXT,
  notas TEXT,
  specialty TEXT,
  license_number TEXT,
  consultation_fee NUMERIC,
  available_hours JSONB
);

CREATE TABLE IF NOT EXISTS user_passwords (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  type TEXT NOT NULL DEFAULT 'followup',
  notes TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  amount NUMERIC,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS patient_logs (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  doctor_nombre TEXT,
  doctor_cedula TEXT,
  date TEXT NOT NULL,
  appointment_id TEXT,
  motivo_consulta TEXT,
  evolucion_clinica TEXT,
  exploracion_fisica TEXT,
  mood INT,
  symptoms JSONB DEFAULT '[]',
  examen_mental TEXT,
  riesgo_suicida TEXT,
  riesgo_violencia TEXT,
  consumo_sustancias TEXT,
  signos_vitales JSONB DEFAULT '{}',
  resultados_estudios TEXT,
  diagnosticos JSONB DEFAULT '[]',
  pronostico TEXT,
  progress TEXT,
  indicaciones JSONB DEFAULT '[]',
  treatment TEXT,
  proxima_cita TEXT,
  firma_digital TEXT,
  audit_trail JSONB DEFAULT '[]',
  addendums JSONB DEFAULT '[]',
  bloqueado BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS historias_clinicas (
  id TEXT PRIMARY KEY,
  patient_id TEXT UNIQUE NOT NULL,
  doctor_id TEXT NOT NULL,
  doctor_nombre TEXT,
  doctor_cedula TEXT,
  fecha_creacion TEXT,
  fecha_actualizacion TEXT,
  ficha_identificacion JSONB DEFAULT '{}',
  antecedentes_heredo_familiares JSONB DEFAULT '{}',
  antecedentes_personales_patologicos JSONB DEFAULT '{}',
  antecedentes_personales_no_patologicos JSONB DEFAULT '{}',
  antecedentes_psiquiatricos JSONB DEFAULT '{}',
  padecimiento_actual TEXT,
  interrogatorio JSONB DEFAULT '{}',
  exploracion_fisica TEXT,
  signos_vitales JSONB DEFAULT '{}',
  examen_mental TEXT,
  resultados_estudios_previos TEXT,
  diagnosticos JSONB DEFAULT '[]',
  pronostico TEXT,
  plan_terapeutico TEXT,
  indicaciones_iniciales JSONB DEFAULT '[]',
  firma_digital TEXT,
  audit_trail JSONB DEFAULT '[]',
  bloqueado BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  appointment_id TEXT,
  date TEXT NOT NULL,
  medications JSONB DEFAULT '[]',
  diagnosis TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor_id TEXT NOT NULL,
  date TEXT,
  title TEXT,
  description TEXT,
  steps JSONB DEFAULT '[]',
  category TEXT,
  priority TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  patient_id TEXT NOT NULL,
  amount NUMERIC,
  method TEXT,
  status TEXT DEFAULT 'pending',
  date TEXT,
  reference TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT,
  title TEXT,
  content TEXT,
  excerpt TEXT,
  category TEXT,
  tags JSONB DEFAULT '[]',
  published_at TEXT,
  updated_at TEXT,
  published BOOLEAN DEFAULT FALSE,
  comments JSONB DEFAULT '[]',
  created_at TEXT NOT NULL
);
`;
