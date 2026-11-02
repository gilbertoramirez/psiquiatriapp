// Helpers for the electronic clinical record (NOM-004-SSA3-2012 / NOM-024-SSA3-2012).
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/create-notification';
import { DiagnosticoCIE10, IndicacionMedica } from '@/types';

// SHA-256 integrity hash over the fields that identify a record.
export function integrityHash(fields: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}

// A doctor may access a patient they registered, invited, or have an appointment with.
export async function doctorHasPatient(doctorId: string, patientId: string): Promise<boolean> {
  const [managed, invitation, appointment] = await Promise.all([
    prisma.patient.count({ where: { id: patientId, managedByDoctorId: doctorId } }),
    prisma.invitation.count({ where: { patientId, doctorId } }),
    prisma.appointment.count({ where: { patientId, doctorId } }),
  ]);
  return managed + invitation + appointment > 0;
}

export async function getDoctorIdentity(doctorId: string, fallbackName: string) {
  const doctor = await prisma.doctor.findUnique({
    where: { id: doctorId },
    select: { name: true, licenseNumber: true },
  });
  return { nombre: doctor?.name || fallbackName, cedula: doctor?.licenseNumber || '' };
}

// Creates a prescription from the medications listed in a clinical note.
export async function createPrescriptionFromIndicaciones(params: {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  indicaciones: IndicacionMedica[];
  diagnosticos: DiagnosticoCIE10[];
  source: string;
}) {
  const { patientId, doctorId, appointmentId, indicaciones, diagnosticos, source } = params;
  if (!indicaciones?.length) return null;

  const diagnosis = diagnosticos.map(d => `${d.codigo} - ${d.descripcion}`).join('; ');
  const prescription = await prisma.prescription.create({
    data: {
      patientId,
      doctorId,
      appointmentId,
      date: new Date().toISOString(),
      medications: indicaciones.map(ind => ({
        name: ind.medicamento,
        dosage: ind.dosis,
        frequency: `${ind.frecuencia} (vía ${ind.via})`,
        duration: ind.duracion,
        instructions: ind.instrucciones || '',
      })),
      diagnosis: diagnosis || `Ver ${source}`,
      notes: `Generada automáticamente desde ${source}`,
    },
  });

  await createNotification({
    userId: patientId,
    userRole: 'patient',
    type: 'prescription',
    title: 'Nueva receta',
    message: 'Tu doctora te ha creado una nueva receta médica.',
  });

  return prescription;
}
