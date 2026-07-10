-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PatientLog" ADD COLUMN     "soapNotes" JSONB;

-- CreateTable
CREATE TABLE "PatientCheckIn" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mood" INTEGER NOT NULL,
    "sleep" DOUBLE PRECISION NOT NULL,
    "sleepQuality" INTEGER NOT NULL,
    "anxiety" INTEGER NOT NULL,
    "energy" INTEGER NOT NULL,
    "sideEffects" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientCheckIn_patientId_date_idx" ON "PatientCheckIn"("patientId", "date");

-- AddForeignKey
ALTER TABLE "PatientCheckIn" ADD CONSTRAINT "PatientCheckIn_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
