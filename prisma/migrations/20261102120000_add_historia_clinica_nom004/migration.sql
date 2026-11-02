-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "curp" TEXT,
ADD COLUMN     "managedByDoctorId" TEXT,
ADD COLUMN     "notas" TEXT;

-- AlterTable
ALTER TABLE "PatientLog" ADD COLUMN     "addendums" JSONB,
ADD COLUMN     "auditTrail" JSONB,
ADD COLUMN     "bloqueado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consumoSustancias" TEXT,
ADD COLUMN     "diagnosticos" JSONB,
ADD COLUMN     "doctorCedula" TEXT,
ADD COLUMN     "doctorNombre" TEXT,
ADD COLUMN     "evolucionClinica" TEXT,
ADD COLUMN     "examenMental" TEXT,
ADD COLUMN     "exploracionFisica" TEXT,
ADD COLUMN     "firmaDigital" TEXT,
ADD COLUMN     "indicaciones" JSONB,
ADD COLUMN     "motivoConsulta" TEXT,
ADD COLUMN     "pronostico" TEXT,
ADD COLUMN     "proximaCita" TEXT,
ADD COLUMN     "resultadosEstudios" TEXT,
ADD COLUMN     "riesgoSuicida" TEXT,
ADD COLUMN     "riesgoViolencia" TEXT,
ADD COLUMN     "signosVitales" JSONB;

-- CreateTable
CREATE TABLE "HistoriaClinica" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorNombre" TEXT NOT NULL,
    "doctorCedula" TEXT NOT NULL,
    "fichaIdentificacion" JSONB NOT NULL,
    "antecedentesHeredoFamiliares" JSONB NOT NULL,
    "antecedentesPersonalesPatologicos" JSONB NOT NULL,
    "antecedentesPersonalesNoPatologicos" JSONB NOT NULL,
    "antecedentesPsiquiatricos" JSONB NOT NULL,
    "padecimientoActual" TEXT NOT NULL,
    "interrogatorio" JSONB NOT NULL,
    "exploracionFisica" TEXT NOT NULL DEFAULT '',
    "signosVitales" JSONB NOT NULL,
    "examenMental" TEXT NOT NULL DEFAULT '',
    "resultadosEstudiosPrevios" TEXT NOT NULL DEFAULT '',
    "diagnosticos" JSONB NOT NULL,
    "pronostico" TEXT NOT NULL DEFAULT '',
    "planTerapeutico" TEXT NOT NULL DEFAULT '',
    "indicacionesIniciales" JSONB NOT NULL,
    "firmaDigital" TEXT NOT NULL,
    "auditTrail" JSONB NOT NULL,
    "bloqueado" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoriaClinica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HistoriaClinica_patientId_key" ON "HistoriaClinica"("patientId");

-- CreateIndex
CREATE INDEX "HistoriaClinica_doctorId_idx" ON "HistoriaClinica"("doctorId");

-- CreateIndex
CREATE INDEX "Patient_managedByDoctorId_idx" ON "Patient"("managedByDoctorId");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_managedByDoctorId_fkey" FOREIGN KEY ("managedByDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriaClinica" ADD CONSTRAINT "HistoriaClinica_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

