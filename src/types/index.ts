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
