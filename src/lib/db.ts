// In-memory database for demo purposes.
// Replace with PostgreSQL/MySQL/MongoDB in production.
// Uses globalThis to persist data across Next.js hot reloads in development.

import { Patient, Doctor, Appointment, Prescription, Recommendation, PatientLog, Payment, BlogPost, HistoriaClinica } from '@/types';

interface Database {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  recommendations: Recommendation[];
  patientLogs: PatientLog[];
  historiasClinicas: HistoriaClinica[];
  payments: Payment[];
  blogPosts: BlogPost[];
}

const defaultDoctor: Doctor = {
  id: 'doc-1',
  email: 'dr.garcia@psiquiatriapp.com',
  name: 'Dra. María García López',
  role: 'doctor',
  phone: '+52 55 1234 5678',
  specialty: 'Psiquiatría General',
  licenseNumber: 'PSQ-2024-001',
  consultationFee: 1500,
  createdAt: new Date().toISOString(),
  availableHours: {
    monday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
    tuesday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
    wednesday: [{ start: '09:00', end: '14:00' }],
    thursday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
    friday: [{ start: '09:00', end: '14:00' }],
  },
};

const doctorClaudia: Doctor = {
  id: 'doc-2',
  email: 'dra.claudiahdz@psiquiatriapp.com',
  name: 'Dra. Claudia Anahí Hernández Carrillo',
  role: 'doctor',
  specialty: 'Psiquiatría',
  licenseNumber: 'PSQ-2024-002',
  consultationFee: 1500,
  createdAt: new Date().toISOString(),
  availableHours: {
    monday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
    tuesday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
    wednesday: [{ start: '09:00', end: '14:00' }],
    thursday: [{ start: '09:00', end: '14:00' }, { start: '16:00', end: '19:00' }],
    friday: [{ start: '09:00', end: '14:00' }],
  },
};

function createDatabase(): Database {
  return {
    patients: [],
    doctors: [defaultDoctor, doctorClaudia],
    appointments: [],
    prescriptions: [],
    recommendations: [],
    patientLogs: [],
    historiasClinicas: [],
    payments: [],
    blogPosts: [],
  };
}

const globalForDb = globalThis as unknown as { __psiquiatriapp_db?: Database };

if (!globalForDb.__psiquiatriapp_db) {
  globalForDb.__psiquiatriapp_db = createDatabase();
}

const db: Database = globalForDb.__psiquiatriapp_db;

export default db;
