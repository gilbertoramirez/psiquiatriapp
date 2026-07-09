// In-memory database for demo purposes.
// Replace with PostgreSQL/MySQL/MongoDB in production.

import { Patient, Doctor, Appointment, Prescription, Recommendation, PatientLog, Payment, BlogPost, Invitation } from '@/types';

interface Database {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  recommendations: Recommendation[];
  patientLogs: PatientLog[];
  payments: Payment[];
  blogPosts: BlogPost[];
  invitations: Invitation[];
}

const db: Database = {
  patients: [],
  doctors: [
    {
      id: 'doc-1',
      email: 'dra.hernandez@psiquiatriapp.com',
      name: 'Dra. Claudia Anahí Hernández Carrillo',
      role: 'doctor',
      phone: '+52 33 1234 5678',
      specialty: 'Psiquiatría',
      licenseNumber: 'PSQ-2024-001',
      consultationFee: 1000,
      address: 'Calle José Guadalupe Zuno 2227, 44150 Obrera Centro, Jalisco, México',
      createdAt: new Date().toISOString(),
      availableHours: {
        thursday: [{ start: '16:00', end: '20:00' }],
        friday: [{ start: '16:00', end: '20:00' }],
        saturday: [{ start: '09:00', end: '14:00' }],
      },
      modalityByDay: {
        thursday: 'both',
        friday: 'online',
        saturday: 'both',
      },
    },
  ],
  appointments: [],
  prescriptions: [],
  recommendations: [],
  patientLogs: [],
  payments: [],
  blogPosts: [],
  invitations: [],
};

export default db;
