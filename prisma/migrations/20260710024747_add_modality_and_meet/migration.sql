-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "calendarEventId" TEXT,
ADD COLUMN     "meetLink" TEXT,
ADD COLUMN     "modality" TEXT NOT NULL DEFAULT 'in-person';
