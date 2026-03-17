// In-memory database for demo purposes.
// Replace with PostgreSQL/MySQL/MongoDB in production.

import { Patient, Doctor, Appointment, Prescription, Recommendation, PatientLog, Payment } from '@/types';

interface Database {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  recommendations: Recommendation[];
  patientLogs: PatientLog[];
  payments: Payment[];
}

const db: Database = {
  patients: [],
  doctors: [
    {
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
    },
  ],
  appointments: [],
  prescriptions: [],
  recommendations: [],
  patientLogs: [],
  payments: [],
};

export default db;
