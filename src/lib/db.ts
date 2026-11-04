// Persistent database module.
// Uses Postgres (Neon) when DATABASE_URL is set, otherwise falls back to in-memory store.

import { Patient, Doctor, Appointment, Prescription, Recommendation, PatientLog, Payment, BlogPost, HistoriaClinica, BlogComment, AuditEntry } from '@/types';
import { hashSync } from 'bcryptjs';
import { getSql, type Sql, type Row } from './pg';

// ===================== ROW MAPPERS =====================

function rowToPatient(r: Record<string, unknown>): Patient {
  return {
    id: r.id as string,
    email: r.email as string,
    name: r.name as string,
    role: 'patient',
    phone: r.phone as string | undefined,
    createdAt: r.created_at as string,
    dateOfBirth: r.date_of_birth as string | undefined,
    emergencyContact: r.emergency_contact as string | undefined,
    emergencyPhone: r.emergency_phone as string | undefined,
    curp: r.curp as string | undefined,
    medicalHistory: r.medical_history as string | undefined,
    creadoPorDoctor: r.creado_por_doctor as boolean | undefined,
    sinCuentaDigital: r.sin_cuenta_digital as boolean | undefined,
    doctorId: r.doctor_id as string | undefined,
    notas: r.notas as string | undefined,
  };
}

function rowToDoctor(r: Record<string, unknown>): Doctor {
  return {
    id: r.id as string,
    email: r.email as string,
    name: r.name as string,
    role: 'doctor',
    phone: r.phone as string | undefined,
    createdAt: r.created_at as string,
    specialty: r.specialty as string,
    licenseNumber: r.license_number as string,
    consultationFee: Number(r.consultation_fee),
    availableHours: (r.available_hours as Record<string, {start: string; end: string}[]>) || {},
  };
}

function rowToAppointment(r: Record<string, unknown>): Appointment {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    doctorId: r.doctor_id as string,
    date: r.date as string,
    startTime: r.start_time as string,
    endTime: r.end_time as string,
    status: r.status as Appointment['status'],
    type: r.type as Appointment['type'],
    notes: r.notes as string | undefined,
    paymentStatus: r.payment_status as Appointment['paymentStatus'],
    amount: Number(r.amount),
  };
}

function rowToLog(r: Record<string, unknown>): PatientLog {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    doctorId: r.doctor_id as string,
    doctorNombre: r.doctor_nombre as string,
    doctorCedula: r.doctor_cedula as string,
    date: r.date as string,
    appointmentId: r.appointment_id as string | undefined,
    motivoConsulta: r.motivo_consulta as string,
    evolucionClinica: r.evolucion_clinica as string,
    exploracionFisica: r.exploracion_fisica as string,
    mood: r.mood as number,
    symptoms: (r.symptoms as string[]) || [],
    examenMental: r.examen_mental as string,
    riesgoSuicida: r.riesgo_suicida as PatientLog['riesgoSuicida'],
    riesgoViolencia: r.riesgo_violencia as PatientLog['riesgoViolencia'],
    consumoSustancias: r.consumo_sustancias as string | undefined,
    signosVitales: (r.signos_vitales as PatientLog['signosVitales']) || {},
    resultadosEstudios: r.resultados_estudios as string | undefined,
    diagnosticos: (r.diagnosticos as PatientLog['diagnosticos']) || [],
    pronostico: r.pronostico as PatientLog['pronostico'],
    progress: r.progress as PatientLog['progress'],
    indicaciones: (r.indicaciones as PatientLog['indicaciones']) || [],
    treatment: r.treatment as string,
    proximaCita: r.proxima_cita as string | undefined,
    firmaDigital: r.firma_digital as string,
    auditTrail: (r.audit_trail as AuditEntry[]) || [],
    addendums: (r.addendums as PatientLog['addendums']) || [],
    bloqueado: r.bloqueado as boolean,
  };
}

function rowToHistoria(r: Record<string, unknown>): HistoriaClinica {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    doctorId: r.doctor_id as string,
    doctorNombre: r.doctor_nombre as string,
    doctorCedula: r.doctor_cedula as string,
    fechaCreacion: r.fecha_creacion as string,
    fechaActualizacion: r.fecha_actualizacion as string,
    fichaIdentificacion: (r.ficha_identificacion as HistoriaClinica['fichaIdentificacion']) || {} as HistoriaClinica['fichaIdentificacion'],
    antecedentesHeredoFamiliares: (r.antecedentes_heredo_familiares as HistoriaClinica['antecedentesHeredoFamiliares']) || {},
    antecedentesPersonalesPatologicos: (r.antecedentes_personales_patologicos as HistoriaClinica['antecedentesPersonalesPatologicos']) || {},
    antecedentesPersonalesNoPatologicos: (r.antecedentes_personales_no_patologicos as HistoriaClinica['antecedentesPersonalesNoPatologicos']) || {},
    antecedentesPsiquiatricos: (r.antecedentes_psiquiatricos as HistoriaClinica['antecedentesPsiquiatricos']) || {},
    padecimientoActual: r.padecimiento_actual as string,
    interrogatorio: (r.interrogatorio as HistoriaClinica['interrogatorio']) || {},
    exploracionFisica: r.exploracion_fisica as string,
    signosVitales: (r.signos_vitales as HistoriaClinica['signosVitales']) || {},
    examenMental: r.examen_mental as string,
    resultadosEstudiosPrevios: r.resultados_estudios_previos as string | undefined,
    diagnosticos: (r.diagnosticos as HistoriaClinica['diagnosticos']) || [],
    pronostico: r.pronostico as string,
    planTerapeutico: r.plan_terapeutico as string,
    indicacionesIniciales: (r.indicaciones_iniciales as HistoriaClinica['indicacionesIniciales']) || [],
    firmaDigital: r.firma_digital as string,
    auditTrail: (r.audit_trail as AuditEntry[]) || [],
    bloqueado: r.bloqueado as boolean,
  };
}

function rowToPrescription(r: Record<string, unknown>): Prescription {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    doctorId: r.doctor_id as string,
    appointmentId: r.appointment_id as string | undefined,
    date: r.date as string,
    medications: (r.medications as Prescription['medications']) || [],
    diagnosis: r.diagnosis as string,
    notes: r.notes as string | undefined,
  };
}

function rowToRecommendation(r: Record<string, unknown>): Recommendation {
  return {
    id: r.id as string,
    patientId: r.patient_id as string,
    doctorId: r.doctor_id as string,
    date: r.date as string,
    title: r.title as string,
    description: r.description as string,
    steps: (r.steps as Recommendation['steps']) || [],
    category: r.category as Recommendation['category'],
    priority: r.priority as Recommendation['priority'],
  };
}

function rowToPayment(r: Record<string, unknown>): Payment {
  return {
    id: r.id as string,
    appointmentId: r.appointment_id as string,
    patientId: r.patient_id as string,
    amount: Number(r.amount),
    method: r.method as Payment['method'],
    status: r.status as Payment['status'],
    date: r.date as string,
    reference: r.reference as string | undefined,
  };
}

function rowToBlogPost(r: Record<string, unknown>): BlogPost {
  return {
    id: r.id as string,
    doctorId: r.doctor_id as string,
    doctorName: r.doctor_name as string,
    title: r.title as string,
    content: r.content as string,
    excerpt: r.excerpt as string,
    category: r.category as BlogPost['category'],
    tags: (r.tags as string[]) || [],
    publishedAt: r.published_at as string,
    updatedAt: r.updated_at as string,
    published: r.published as boolean,
    comments: (r.comments as BlogComment[]) || [],
  };
}

// ===================== POSTGRES BACKEND =====================

function pgDb(sql: Sql) {
  return {
    patients: {
      async findByEmail(email: string): Promise<Patient | null> {
        const rows = await sql`SELECT * FROM users WHERE email = ${email} AND role = 'patient'`;
        return rows[0] ? rowToPatient(rows[0] as Row) : null;
      },
      async findById(id: string): Promise<Patient | null> {
        const rows = await sql`SELECT * FROM users WHERE id = ${id} AND role = 'patient'`;
        return rows[0] ? rowToPatient(rows[0] as Row) : null;
      },
      async findManagedByDoctor(doctorId: string): Promise<Patient[]> {
        const rows = await sql`SELECT * FROM users WHERE role = 'patient' AND creado_por_doctor = TRUE AND doctor_id = ${doctorId}`;
        return rows.map(r => rowToPatient(r as Row));
      },
      async findAllForDoctor(doctorId: string): Promise<Patient[]> {
        const rows = await sql`
          SELECT DISTINCT u.* FROM users u
          WHERE u.role = 'patient' AND (
            u.id IN (SELECT patient_id FROM appointments WHERE doctor_id = ${doctorId})
            OR (u.creado_por_doctor = TRUE AND u.doctor_id = ${doctorId})
          )`;
        return rows.map(r => rowToPatient(r as Row));
      },
      async create(p: Patient): Promise<void> {
        await sql`INSERT INTO users (
          id, email, name, role, phone, created_at,
          date_of_birth, emergency_contact, emergency_phone, curp, medical_history,
          creado_por_doctor, sin_cuenta_digital, doctor_id, notas
        ) VALUES (
          ${p.id}, ${p.email}, ${p.name}, 'patient', ${p.phone ?? null}, ${p.createdAt},
          ${p.dateOfBirth ?? null}, ${p.emergencyContact ?? null}, ${p.emergencyPhone ?? null},
          ${p.curp ?? null}, ${p.medicalHistory ?? null},
          ${p.creadoPorDoctor ?? false}, ${p.sinCuentaDigital ?? false},
          ${p.doctorId ?? null}, ${p.notas ?? null}
        )`;
      },
      async update(id: string, f: Partial<Patient>): Promise<void> {
        const sets: string[] = [];
        const vals: unknown[] = [];
        let i = 1;
        if (f.name !== undefined) { sets.push(`name = $${i++}`); vals.push(f.name); }
        if (f.email !== undefined) { sets.push(`email = $${i++}`); vals.push(f.email); }
        if (f.phone !== undefined) { sets.push(`phone = $${i++}`); vals.push(f.phone ?? null); }
        if (f.dateOfBirth !== undefined) { sets.push(`date_of_birth = $${i++}`); vals.push(f.dateOfBirth ?? null); }
        if (f.emergencyContact !== undefined) { sets.push(`emergency_contact = $${i++}`); vals.push(f.emergencyContact ?? null); }
        if (f.emergencyPhone !== undefined) { sets.push(`emergency_phone = $${i++}`); vals.push(f.emergencyPhone ?? null); }
        if (f.curp !== undefined) { sets.push(`curp = $${i++}`); vals.push(f.curp ?? null); }
        if (f.notas !== undefined) { sets.push(`notas = $${i++}`); vals.push(f.notas ?? null); }
        if (sets.length === 0) return;
        vals.push(id);
        await sql.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals);
      },
      async delete(id: string): Promise<void> {
        await sql`DELETE FROM users WHERE id = ${id} AND role = 'patient'`;
      },
      async migrateId(fromId: string, toId: string): Promise<void> {
        await sql`UPDATE appointments SET patient_id = ${toId} WHERE patient_id = ${fromId}`;
        await sql`UPDATE patient_logs SET patient_id = ${toId} WHERE patient_id = ${fromId}`;
        await sql`UPDATE historias_clinicas SET patient_id = ${toId} WHERE patient_id = ${fromId}`;
        await sql`DELETE FROM users WHERE id = ${fromId}`;
      },
    },

    doctors: {
      async findAll(): Promise<Doctor[]> {
        const rows = await sql`SELECT * FROM users WHERE role = 'doctor'`;
        return rows.map(r => rowToDoctor(r as Record<string, unknown>));
      },
      async findById(id: string): Promise<Doctor | null> {
        const rows = await sql`SELECT * FROM users WHERE id = ${id} AND role = 'doctor'`;
        return rows[0] ? rowToDoctor(rows[0] as Record<string, unknown>) : null;
      },
      async findByEmail(email: string): Promise<Doctor | null> {
        const rows = await sql`SELECT * FROM users WHERE email = ${email} AND role = 'doctor'`;
        return rows[0] ? rowToDoctor(rows[0] as Record<string, unknown>) : null;
      },
    },

    appointments: {
      async findByDoctorId(doctorId: string): Promise<Appointment[]> {
        const rows = await sql`SELECT * FROM appointments WHERE doctor_id = ${doctorId} ORDER BY date DESC, start_time ASC`;
        return rows.map(r => rowToAppointment(r as Record<string, unknown>));
      },
      async findByPatientId(patientId: string): Promise<Appointment[]> {
        const rows = await sql`SELECT * FROM appointments WHERE patient_id = ${patientId} ORDER BY date DESC`;
        return rows.map(r => rowToAppointment(r as Record<string, unknown>));
      },
      async findByDoctorAndDate(doctorId: string, date: string): Promise<Appointment[]> {
        const rows = await sql`SELECT * FROM appointments WHERE doctor_id = ${doctorId} AND date = ${date} AND status != 'cancelled'`;
        return rows.map(r => rowToAppointment(r as Record<string, unknown>));
      },
      async findConflict(doctorId: string, date: string, startTime: string): Promise<Appointment | null> {
        const rows = await sql`SELECT * FROM appointments WHERE doctor_id = ${doctorId} AND date = ${date} AND start_time = ${startTime} AND status != 'cancelled'`;
        return rows[0] ? rowToAppointment(rows[0] as Record<string, unknown>) : null;
      },
      async create(a: Appointment): Promise<void> {
        const now = new Date().toISOString();
        await sql`INSERT INTO appointments (
          id, patient_id, doctor_id, date, start_time, end_time,
          status, type, notes, payment_status, amount, created_at
        ) VALUES (
          ${a.id}, ${a.patientId}, ${a.doctorId}, ${a.date}, ${a.startTime}, ${a.endTime},
          ${a.status}, ${a.type}, ${a.notes ?? null}, ${a.paymentStatus}, ${a.amount}, ${now}
        )`;
      },
      async findById(id: string): Promise<Appointment | null> {
        const rows = await sql`SELECT * FROM appointments WHERE id = ${id}`;
        return rows[0] ? rowToAppointment(rows[0] as Record<string, unknown>) : null;
      },
      async update(id: string, f: { status?: Appointment['status']; paymentStatus?: Appointment['paymentStatus'] }): Promise<void> {
        const sets: string[] = [];
        const vals: unknown[] = [];
        let i = 1;
        if (f.status !== undefined) { sets.push(`status = $${i++}`); vals.push(f.status); }
        if (f.paymentStatus !== undefined) { sets.push(`payment_status = $${i++}`); vals.push(f.paymentStatus); }
        if (sets.length === 0) return;
        vals.push(id);
        await sql.query(`UPDATE appointments SET ${sets.join(', ')} WHERE id = $${i}`, vals);
      },
      async migratePatientId(fromId: string, toId: string): Promise<void> {
        await sql`UPDATE appointments SET patient_id = ${toId} WHERE patient_id = ${fromId}`;
      },
    },

    patientLogs: {
      async findByPatientId(patientId: string): Promise<PatientLog[]> {
        const rows = await sql`SELECT * FROM patient_logs WHERE patient_id = ${patientId} ORDER BY date DESC`;
        return rows.map(r => rowToLog(r as Record<string, unknown>));
      },
      async findByPatientAndDoctor(patientId: string, doctorId: string): Promise<PatientLog[]> {
        const rows = await sql`SELECT * FROM patient_logs WHERE patient_id = ${patientId} AND doctor_id = ${doctorId} ORDER BY date DESC`;
        return rows.map(r => rowToLog(r as Record<string, unknown>));
      },
      async findById(id: string): Promise<PatientLog | null> {
        const rows = await sql`SELECT * FROM patient_logs WHERE id = ${id}`;
        return rows[0] ? rowToLog(rows[0] as Record<string, unknown>) : null;
      },
      async findByDoctorId(doctorId: string): Promise<PatientLog[]> {
        const rows = await sql`SELECT * FROM patient_logs WHERE doctor_id = ${doctorId} ORDER BY date DESC`;
        return rows.map(r => rowToLog(r as Record<string, unknown>));
      },
      async create(log: PatientLog): Promise<void> {
        const now = new Date().toISOString();
        await sql`INSERT INTO patient_logs (
          id, patient_id, doctor_id, doctor_nombre, doctor_cedula, date, appointment_id,
          motivo_consulta, evolucion_clinica, exploracion_fisica,
          mood, symptoms, examen_mental, riesgo_suicida, riesgo_violencia, consumo_sustancias,
          signos_vitales, resultados_estudios, diagnosticos, pronostico, progress,
          indicaciones, treatment, proxima_cita,
          firma_digital, audit_trail, addendums, bloqueado, created_at
        ) VALUES (
          ${log.id}, ${log.patientId}, ${log.doctorId}, ${log.doctorNombre}, ${log.doctorCedula},
          ${log.date}, ${log.appointmentId ?? null},
          ${log.motivoConsulta}, ${log.evolucionClinica}, ${log.exploracionFisica},
          ${log.mood}, ${JSON.stringify(log.symptoms)}, ${log.examenMental},
          ${log.riesgoSuicida}, ${log.riesgoViolencia}, ${log.consumoSustancias ?? null},
          ${JSON.stringify(log.signosVitales)}, ${log.resultadosEstudios ?? null},
          ${JSON.stringify(log.diagnosticos)}, ${log.pronostico}, ${log.progress},
          ${JSON.stringify(log.indicaciones)}, ${log.treatment}, ${log.proximaCita ?? null},
          ${log.firmaDigital}, ${JSON.stringify(log.auditTrail)},
          ${JSON.stringify(log.addendums)}, ${log.bloqueado}, ${now}
        )`;
      },
      async addAddendum(logId: string, addendum: { fecha: string; contenido: string; usuario: string }, auditEntry: AuditEntry): Promise<PatientLog | null> {
        const rows = await sql`SELECT * FROM patient_logs WHERE id = ${logId}`;
        if (!rows[0]) return null;
        const log = rowToLog(rows[0] as Record<string, unknown>);
        log.addendums.push(addendum);
        log.auditTrail.push(auditEntry);
        await sql`UPDATE patient_logs SET addendums = ${JSON.stringify(log.addendums)}, audit_trail = ${JSON.stringify(log.auditTrail)} WHERE id = ${logId}`;
        return log;
      },
      async migratePatientId(fromId: string, toId: string): Promise<void> {
        await sql`UPDATE patient_logs SET patient_id = ${toId} WHERE patient_id = ${fromId}`;
      },
    },

    historiasClinicas: {
      async findByPatientId(patientId: string): Promise<HistoriaClinica | null> {
        const rows = await sql`SELECT * FROM historias_clinicas WHERE patient_id = ${patientId}`;
        return rows[0] ? rowToHistoria(rows[0] as Record<string, unknown>) : null;
      },
      async findByPatientAndDoctor(patientId: string, doctorId: string): Promise<HistoriaClinica | null> {
        const rows = await sql`SELECT * FROM historias_clinicas WHERE patient_id = ${patientId} AND doctor_id = ${doctorId}`;
        return rows[0] ? rowToHistoria(rows[0] as Record<string, unknown>) : null;
      },
      async create(hc: HistoriaClinica): Promise<void> {
        await sql`INSERT INTO historias_clinicas (
          id, patient_id, doctor_id, doctor_nombre, doctor_cedula, fecha_creacion, fecha_actualizacion,
          ficha_identificacion, antecedentes_heredo_familiares, antecedentes_personales_patologicos,
          antecedentes_personales_no_patologicos, antecedentes_psiquiatricos, padecimiento_actual,
          interrogatorio, exploracion_fisica, signos_vitales, examen_mental, resultados_estudios_previos,
          diagnosticos, pronostico, plan_terapeutico, indicaciones_iniciales,
          firma_digital, audit_trail, bloqueado
        ) VALUES (
          ${hc.id}, ${hc.patientId}, ${hc.doctorId}, ${hc.doctorNombre}, ${hc.doctorCedula},
          ${hc.fechaCreacion}, ${hc.fechaActualizacion},
          ${JSON.stringify(hc.fichaIdentificacion)}, ${JSON.stringify(hc.antecedentesHeredoFamiliares)},
          ${JSON.stringify(hc.antecedentesPersonalesPatologicos)}, ${JSON.stringify(hc.antecedentesPersonalesNoPatologicos)},
          ${JSON.stringify(hc.antecedentesPsiquiatricos)}, ${hc.padecimientoActual},
          ${JSON.stringify(hc.interrogatorio)}, ${hc.exploracionFisica}, ${JSON.stringify(hc.signosVitales)},
          ${hc.examenMental}, ${hc.resultadosEstudiosPrevios ?? null},
          ${JSON.stringify(hc.diagnosticos)}, ${hc.pronostico}, ${hc.planTerapeutico},
          ${JSON.stringify(hc.indicacionesIniciales)},
          ${hc.firmaDigital}, ${JSON.stringify(hc.auditTrail)}, ${hc.bloqueado}
        )`;
      },
      async update(patientId: string, fields: Partial<HistoriaClinica>): Promise<HistoriaClinica | null> {
        const sets: string[] = [];
        const vals: unknown[] = [];
        let i = 1;
        const mapping: Record<string, string> = {
          fichaIdentificacion: 'ficha_identificacion',
          antecedentesHeredoFamiliares: 'antecedentes_heredo_familiares',
          antecedentesPersonalesPatologicos: 'antecedentes_personales_patologicos',
          antecedentesPersonalesNoPatologicos: 'antecedentes_personales_no_patologicos',
          antecedentesPsiquiatricos: 'antecedentes_psiquiatricos',
          padecimientoActual: 'padecimiento_actual',
          interrogatorio: 'interrogatorio',
          exploracionFisica: 'exploracion_fisica',
          signosVitales: 'signos_vitales',
          examenMental: 'examen_mental',
          resultadosEstudiosPrevios: 'resultados_estudios_previos',
          diagnosticos: 'diagnosticos',
          pronostico: 'pronostico',
          planTerapeutico: 'plan_terapeutico',
          indicacionesIniciales: 'indicaciones_iniciales',
          firmaDigital: 'firma_digital',
          auditTrail: 'audit_trail',
          fechaActualizacion: 'fecha_actualizacion',
        };
        for (const [key, col] of Object.entries(mapping)) {
          if (fields[key as keyof HistoriaClinica] !== undefined) {
            const val = fields[key as keyof HistoriaClinica];
            sets.push(`${col} = $${i++}`);
            vals.push(typeof val === 'object' ? JSON.stringify(val) : val);
          }
        }
        if (sets.length === 0) return this.findByPatientId(patientId);
        vals.push(patientId);
        await sql.query(`UPDATE historias_clinicas SET ${sets.join(', ')} WHERE patient_id = $${i}`, vals);
        return this.findByPatientId(patientId);
      },
      async migratePatientId(fromId: string, toId: string): Promise<void> {
        await sql`UPDATE historias_clinicas SET patient_id = ${toId} WHERE patient_id = ${fromId}`;
      },
    },

    prescriptions: {
      async findByDoctorId(doctorId: string): Promise<Prescription[]> {
        const rows = await sql`SELECT * FROM prescriptions WHERE doctor_id = ${doctorId} ORDER BY date DESC`;
        return rows.map(r => rowToPrescription(r as Record<string, unknown>));
      },
      async findByPatientId(patientId: string): Promise<Prescription[]> {
        const rows = await sql`SELECT * FROM prescriptions WHERE patient_id = ${patientId} ORDER BY date DESC`;
        return rows.map(r => rowToPrescription(r as Record<string, unknown>));
      },
      async create(rx: Prescription): Promise<void> {
        const now = new Date().toISOString();
        await sql`INSERT INTO prescriptions (id, patient_id, doctor_id, appointment_id, date, medications, diagnosis, notes, created_at)
          VALUES (${rx.id}, ${rx.patientId}, ${rx.doctorId}, ${rx.appointmentId ?? null}, ${rx.date}, ${JSON.stringify(rx.medications)}, ${rx.diagnosis}, ${rx.notes ?? null}, ${now})`;
      },
    },

    recommendations: {
      async findByDoctorId(doctorId: string): Promise<Recommendation[]> {
        const rows = await sql`SELECT * FROM recommendations WHERE doctor_id = ${doctorId} ORDER BY created_at DESC`;
        return rows.map(r => rowToRecommendation(r as Record<string, unknown>));
      },
      async findByPatientId(patientId: string): Promise<Recommendation[]> {
        const rows = await sql`SELECT * FROM recommendations WHERE patient_id = ${patientId} ORDER BY created_at DESC`;
        return rows.map(r => rowToRecommendation(r as Record<string, unknown>));
      },
      async create(rec: Recommendation): Promise<void> {
        const now = new Date().toISOString();
        await sql`INSERT INTO recommendations (id, patient_id, doctor_id, date, title, description, steps, category, priority, created_at)
          VALUES (${rec.id}, ${rec.patientId}, ${rec.doctorId}, ${rec.date ?? now}, ${rec.title}, ${rec.description}, ${JSON.stringify(rec.steps)}, ${rec.category}, ${rec.priority}, ${now})`;
      },
    },

    payments: {
      async findByPatientId(patientId: string): Promise<Payment[]> {
        const rows = await sql`SELECT * FROM payments WHERE patient_id = ${patientId} ORDER BY date DESC`;
        return rows.map(r => rowToPayment(r as Record<string, unknown>));
      },
      async findByDoctorId(doctorId: string): Promise<Payment[]> {
        const rows = await sql`SELECT p.* FROM payments p JOIN appointments a ON p.appointment_id = a.id WHERE a.doctor_id = ${doctorId} ORDER BY p.date DESC`;
        return rows.map(r => rowToPayment(r as Record<string, unknown>));
      },
      async create(payment: Payment): Promise<void> {
        const now = new Date().toISOString();
        await sql`INSERT INTO payments (id, appointment_id, patient_id, amount, method, status, date, reference, created_at)
          VALUES (${payment.id}, ${payment.appointmentId}, ${payment.patientId}, ${payment.amount}, ${payment.method}, ${payment.status}, ${payment.date}, ${payment.reference ?? null}, ${now})`;
      },
    },

    blogPosts: {
      async findAll(doctorId?: string): Promise<BlogPost[]> {
        let rows;
        if (doctorId) {
          rows = await sql`SELECT * FROM blog_posts WHERE doctor_id = ${doctorId} OR published = TRUE ORDER BY published_at DESC`;
        } else {
          rows = await sql`SELECT * FROM blog_posts WHERE published = TRUE ORDER BY published_at DESC`;
        }
        return rows.map(r => rowToBlogPost(r as Record<string, unknown>));
      },
      async findById(id: string): Promise<BlogPost | null> {
        const rows = await sql`SELECT * FROM blog_posts WHERE id = ${id}`;
        return rows[0] ? rowToBlogPost(rows[0] as Record<string, unknown>) : null;
      },
      async create(post: BlogPost): Promise<void> {
        const now = new Date().toISOString();
        await sql`INSERT INTO blog_posts (id, doctor_id, doctor_name, title, content, excerpt, category, tags, published_at, updated_at, published, comments, created_at)
          VALUES (${post.id}, ${post.doctorId}, ${post.doctorName}, ${post.title}, ${post.content}, ${post.excerpt}, ${post.category}, ${JSON.stringify(post.tags)}, ${post.publishedAt}, ${post.updatedAt}, ${post.published}, ${JSON.stringify(post.comments)}, ${now})`;
      },
      async addComment(postId: string, comment: BlogComment): Promise<BlogPost | null> {
        const post = await this.findById(postId);
        if (!post) return null;
        post.comments.push(comment);
        await sql`UPDATE blog_posts SET comments = ${JSON.stringify(post.comments)} WHERE id = ${postId}`;
        return post;
      },
    },

    passwords: {
      async get(userId: string): Promise<string | null> {
        const rows = await sql`SELECT hash FROM user_passwords WHERE user_id = ${userId}`;
        return rows[0] ? (rows[0] as Record<string, unknown>).hash as string : null;
      },
      async set(userId: string, hash: string): Promise<void> {
        await sql`INSERT INTO user_passwords (user_id, hash) VALUES (${userId}, ${hash})
          ON CONFLICT (user_id) DO UPDATE SET hash = ${hash}`;
      },
    },
  };
}

// ===================== IN-MEMORY BACKEND =====================

interface InMemoryDB {
  patients: Patient[];
  doctors: Doctor[];
  appointments: Appointment[];
  prescriptions: Prescription[];
  recommendations: Recommendation[];
  patientLogs: PatientLog[];
  historiasClinicas: HistoriaClinica[];
  payments: Payment[];
  blogPosts: BlogPost[];
  passwords: Map<string, string>;
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

const globalForDb = globalThis as unknown as { __psiquiatriapp_db2?: InMemoryDB };

if (!globalForDb.__psiquiatriapp_db2) {
  const hash = hashSync('doctor123', 10);
  globalForDb.__psiquiatriapp_db2 = {
    patients: [],
    doctors: [defaultDoctor, doctorClaudia],
    appointments: [],
    prescriptions: [],
    recommendations: [],
    patientLogs: [],
    historiasClinicas: [],
    payments: [],
    blogPosts: [],
    passwords: new Map([['doc-1', hash], ['doc-2', hash]]),
  };
}

const mem = globalForDb.__psiquiatriapp_db2!;

function memDb() {
  return {
    patients: {
      async findByEmail(email: string): Promise<Patient | null> {
        return mem.patients.find(p => p.email === email) ?? null;
      },
      async findById(id: string): Promise<Patient | null> {
        return mem.patients.find(p => p.id === id) ?? null;
      },
      async findManagedByDoctor(doctorId: string): Promise<Patient[]> {
        return mem.patients.filter(p => p.creadoPorDoctor && p.doctorId === doctorId);
      },
      async findAllForDoctor(doctorId: string): Promise<Patient[]> {
        const apptIds = new Set(mem.appointments.filter(a => a.doctorId === doctorId).map(a => a.patientId));
        const managedIds = new Set(mem.patients.filter(p => p.creadoPorDoctor && p.doctorId === doctorId).map(p => p.id));
        const all = new Set([...apptIds, ...managedIds]);
        return mem.patients.filter(p => all.has(p.id));
      },
      async create(p: Patient): Promise<void> {
        mem.patients.push(p);
      },
      async update(id: string, f: Partial<Patient>): Promise<void> {
        const p = mem.patients.find(x => x.id === id);
        if (p) Object.assign(p, f);
      },
      async delete(id: string): Promise<void> {
        const idx = mem.patients.findIndex(p => p.id === id);
        if (idx !== -1) mem.patients.splice(idx, 1);
      },
      async migrateId(fromId: string, toId: string): Promise<void> {
        mem.appointments.forEach(a => { if (a.patientId === fromId) a.patientId = toId; });
        mem.patientLogs.forEach(l => { if (l.patientId === fromId) l.patientId = toId; });
        mem.historiasClinicas.forEach(h => { if (h.patientId === fromId) h.patientId = toId; });
        const idx = mem.patients.findIndex(p => p.id === fromId);
        if (idx !== -1) mem.patients.splice(idx, 1);
      },
    },

    doctors: {
      async findAll(): Promise<Doctor[]> { return mem.doctors; },
      async findById(id: string): Promise<Doctor | null> {
        return mem.doctors.find(d => d.id === id) ?? null;
      },
      async findByEmail(email: string): Promise<Doctor | null> {
        return mem.doctors.find(d => d.email === email) ?? null;
      },
    },

    appointments: {
      async findByDoctorId(doctorId: string): Promise<Appointment[]> {
        return mem.appointments.filter(a => a.doctorId === doctorId);
      },
      async findByPatientId(patientId: string): Promise<Appointment[]> {
        return mem.appointments.filter(a => a.patientId === patientId);
      },
      async findByDoctorAndDate(doctorId: string, date: string): Promise<Appointment[]> {
        return mem.appointments.filter(a => a.doctorId === doctorId && a.date === date && a.status !== 'cancelled');
      },
      async findConflict(doctorId: string, date: string, startTime: string): Promise<Appointment | null> {
        return mem.appointments.find(a => a.doctorId === doctorId && a.date === date && a.startTime === startTime && a.status !== 'cancelled') ?? null;
      },
      async findById(id: string): Promise<Appointment | null> {
        return mem.appointments.find(a => a.id === id) ?? null;
      },
      async update(id: string, f: { status?: Appointment['status']; paymentStatus?: Appointment['paymentStatus'] }): Promise<void> {
        const a = mem.appointments.find(x => x.id === id);
        if (a) Object.assign(a, f);
      },
      async create(a: Appointment): Promise<void> {
        mem.appointments.push(a);
      },
      async migratePatientId(fromId: string, toId: string): Promise<void> {
        mem.appointments.forEach(a => { if (a.patientId === fromId) a.patientId = toId; });
      },
    },

    patientLogs: {
      async findByPatientId(patientId: string): Promise<PatientLog[]> {
        return mem.patientLogs.filter(l => l.patientId === patientId);
      },
      async findByPatientAndDoctor(patientId: string, doctorId: string): Promise<PatientLog[]> {
        return mem.patientLogs.filter(l => l.patientId === patientId && l.doctorId === doctorId);
      },
      async findById(id: string): Promise<PatientLog | null> {
        return mem.patientLogs.find(l => l.id === id) ?? null;
      },
      async findByDoctorId(doctorId: string): Promise<PatientLog[]> {
        return mem.patientLogs.filter(l => l.doctorId === doctorId);
      },
      async create(log: PatientLog): Promise<void> {
        mem.patientLogs.push(log);
      },
      async addAddendum(logId: string, addendum: { fecha: string; contenido: string; usuario: string }, auditEntry: AuditEntry): Promise<PatientLog | null> {
        const log = mem.patientLogs.find(l => l.id === logId);
        if (!log) return null;
        log.addendums.push(addendum);
        log.auditTrail.push(auditEntry);
        return log;
      },
      async migratePatientId(fromId: string, toId: string): Promise<void> {
        mem.patientLogs.forEach(l => { if (l.patientId === fromId) l.patientId = toId; });
      },
    },

    historiasClinicas: {
      async findByPatientId(patientId: string): Promise<HistoriaClinica | null> {
        return mem.historiasClinicas.find(h => h.patientId === patientId) ?? null;
      },
      async findByPatientAndDoctor(patientId: string, doctorId: string): Promise<HistoriaClinica | null> {
        return mem.historiasClinicas.find(h => h.patientId === patientId && h.doctorId === doctorId) ?? null;
      },
      async create(hc: HistoriaClinica): Promise<void> {
        mem.historiasClinicas.push(hc);
      },
      async update(patientId: string, fields: Partial<HistoriaClinica>): Promise<HistoriaClinica | null> {
        const hc = mem.historiasClinicas.find(h => h.patientId === patientId);
        if (hc) Object.assign(hc, fields);
        return hc ?? null;
      },
      async migratePatientId(fromId: string, toId: string): Promise<void> {
        mem.historiasClinicas.forEach(h => { if (h.patientId === fromId) h.patientId = toId; });
      },
    },

    prescriptions: {
      async findByDoctorId(doctorId: string): Promise<Prescription[]> {
        return mem.prescriptions.filter(p => p.doctorId === doctorId);
      },
      async findByPatientId(patientId: string): Promise<Prescription[]> {
        return mem.prescriptions.filter(p => p.patientId === patientId);
      },
      async create(rx: Prescription): Promise<void> {
        mem.prescriptions.push(rx);
      },
    },

    recommendations: {
      async findByDoctorId(doctorId: string): Promise<Recommendation[]> {
        return mem.recommendations.filter(r => r.doctorId === doctorId);
      },
      async findByPatientId(patientId: string): Promise<Recommendation[]> {
        return mem.recommendations.filter(r => r.patientId === patientId);
      },
      async create(rec: Recommendation): Promise<void> {
        mem.recommendations.push(rec);
      },
    },

    payments: {
      async findByPatientId(patientId: string): Promise<Payment[]> {
        return mem.payments.filter(p => p.patientId === patientId);
      },
      async findByDoctorId(doctorId: string): Promise<Payment[]> {
        const doctorAptIds = new Set(mem.appointments.filter(a => a.doctorId === doctorId).map(a => a.id));
        return mem.payments.filter(p => doctorAptIds.has(p.appointmentId));
      },
      async create(payment: Payment): Promise<void> {
        mem.payments.push(payment);
      },
    },

    blogPosts: {
      async findAll(doctorId?: string): Promise<BlogPost[]> {
        if (doctorId) {
          return mem.blogPosts.filter(p => p.doctorId === doctorId || p.published);
        }
        return mem.blogPosts.filter(p => p.published);
      },
      async findById(id: string): Promise<BlogPost | null> {
        return mem.blogPosts.find(p => p.id === id) ?? null;
      },
      async create(post: BlogPost): Promise<void> {
        mem.blogPosts.push(post);
      },
      async addComment(postId: string, comment: BlogComment): Promise<BlogPost | null> {
        const post = mem.blogPosts.find(p => p.id === postId);
        if (!post) return null;
        post.comments.push(comment);
        return post;
      },
    },

    passwords: {
      async get(userId: string): Promise<string | null> {
        return mem.passwords.get(userId) ?? null;
      },
      async set(userId: string, hash: string): Promise<void> {
        mem.passwords.set(userId, hash);
      },
    },
  };
}

// ===================== EXPORT =====================

type DbInterface = ReturnType<typeof memDb>;

let _db: DbInterface | null = null;

function getDb(): DbInterface {
  if (!_db) {
    const sql = getSql();
    if (sql) {
      _db = pgDb(sql) as unknown as DbInterface;
    } else {
      _db = memDb();
    }
  }
  return _db;
}

// Proxy so callers can do: `db.patients.findByEmail(...)` without calling getDb() explicitly
const db = new Proxy({} as DbInterface, {
  get(_target, prop: string) {
    return getDb()[prop as keyof DbInterface];
  },
});

export default db;
