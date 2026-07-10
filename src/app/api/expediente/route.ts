import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'doctor') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const patientId = req.nextUrl.searchParams.get('patientId');
  if (!patientId) {
    return NextResponse.json({ error: 'patientId requerido' }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
  }

  const doctor = await prisma.doctor.findUnique({ where: { id: decoded.id } });
  if (!doctor) {
    return NextResponse.json({ error: 'Doctor no encontrado' }, { status: 404 });
  }

  const [appointments, prescriptions, logs, checkIns, questionnaires] = await Promise.all([
    prisma.appointment.findMany({
      where: { patientId, doctorId: decoded.id },
      orderBy: { date: 'desc' },
    }),
    prisma.prescription.findMany({
      where: { patientId, doctorId: decoded.id },
      orderBy: { date: 'desc' },
    }),
    prisma.patientLog.findMany({
      where: { patientId, doctorId: decoded.id },
      orderBy: { date: 'desc' },
    }),
    prisma.patientCheckIn.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
      take: 10,
    }),
    prisma.clinicalQuestionnaire.findMany({
      where: { patientId },
      orderBy: { date: 'desc' },
    }),
  ]);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Expediente Clinico', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('PsiquiatrIApp', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.text(`Doctor: ${doctor.name}`, 14, y);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, pageWidth - 14, y, { align: 'right' });
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Paciente', 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${patient.name}`, 14, y); y += 5;
  doc.text(`Email: ${patient.email}`, 14, y); y += 5;
  if (patient.phone) { doc.text(`Telefono: ${patient.phone}`, 14, y); y += 5; }
  if (patient.dateOfBirth) { doc.text(`Fecha de nacimiento: ${patient.dateOfBirth}`, 14, y); y += 5; }
  y += 5;

  if (appointments.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Citas', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Hora', 'Modalidad', 'Estado', 'Pago']],
      body: appointments.map(a => [
        a.date,
        `${a.startTime} - ${a.endTime}`,
        a.modality,
        a.status,
        a.paymentStatus,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [250, 128, 114] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? y + 10;
    y += 10;
  }

  if (prescriptions.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recetas', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Diagnostico', 'Medicamentos']],
      body: prescriptions.map(p => {
        const meds = Array.isArray(p.medications)
          ? (p.medications as Array<{ name: string; dosage: string }>).map(m => `${m.name} (${m.dosage})`).join(', ')
          : String(p.medications);
        return [p.date, p.diagnosis, meds];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [250, 128, 114] },
      margin: { left: 14, right: 14 },
      columnStyles: { 2: { cellWidth: 70 } },
    });
    y = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? y + 10;
    y += 10;
  }

  if (logs.length > 0) {
    if (y > 200) { doc.addPage(); y = 15; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Notas Clinicas', 14, y);
    y += 7;

    for (const log of logs) {
      if (y > 250) { doc.addPage(); y = 15; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${log.date} - Estado de animo: ${log.mood}/10 - Progreso: ${log.progress}`, 14, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      if (log.notes) {
        const lines = doc.splitTextToSize(`Notas: ${log.notes}`, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 4 + 2;
      }
      if (log.treatment) {
        const lines = doc.splitTextToSize(`Tratamiento: ${log.treatment}`, pageWidth - 28);
        doc.text(lines, 14, y);
        y += lines.length * 4 + 2;
      }
      const soap = log.soapNotes as { subjective?: string; objective?: string; assessment?: string; plan?: string } | null;
      if (soap) {
        if (soap.subjective) { doc.text(`S: ${soap.subjective}`, 14, y); y += 4; }
        if (soap.objective) { doc.text(`O: ${soap.objective}`, 14, y); y += 4; }
        if (soap.assessment) { doc.text(`A: ${soap.assessment}`, 14, y); y += 4; }
        if (soap.plan) { doc.text(`P: ${soap.plan}`, 14, y); y += 4; }
      }
      y += 4;
    }
    y += 5;
  }

  if (questionnaires.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Cuestionarios Clinicos', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Tipo', 'Puntaje', 'Severidad']],
      body: questionnaires.map(q => [q.date, q.type, String(q.score), q.severity]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [250, 128, 114] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? y + 10;
    y += 10;
  }

  if (checkIns.length > 0) {
    if (y > 240) { doc.addPage(); y = 15; }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Check-ins', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Fecha', 'Animo', 'Ansiedad', 'Energia', 'Sueno (hrs)', 'Calidad sueno']],
      body: checkIns.map(c => [
        c.date,
        String(c.mood),
        String(c.anxiety),
        String(c.energy),
        String(c.sleep),
        String(c.sleepQuality),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [250, 128, 114] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY ?? y + 10;
    y += 10;
  }

  if (doctor.signatureData) {
    if (y > 240) { doc.addPage(); y = 15; }
    y += 10;
    try {
      doc.addImage(doctor.signatureData, 'PNG', 14, y, 60, 25);
      y += 28;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.line(14, y, 74, y);
      y += 4;
      doc.text(`Dr. ${doctor.name}`, 14, y);
      y += 4;
      doc.text(`Ced. Prof. ${doctor.licenseNumber}`, 14, y);
    } catch {
      doc.setFontSize(10);
      doc.text(`Dr. ${doctor.name} - Ced. Prof. ${doctor.licenseNumber}`, 14, y);
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=expediente-${patient.name.replace(/\s/g, '_')}.pdf`,
    },
  });
}
