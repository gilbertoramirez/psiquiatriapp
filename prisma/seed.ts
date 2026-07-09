import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingDoctor = await prisma.doctor.findUnique({
    where: { email: 'dra.hernandez@psiquiatriapp.com' },
  });

  if (!existingDoctor) {
    await prisma.doctor.create({
      data: {
        email: 'dra.hernandez@psiquiatriapp.com',
        name: 'Dra. Claudia Anahí Hernández Carrillo',
        phone: '+52 33 1234 5678',
        specialty: 'Psiquiatría',
        licenseNumber: 'PSQ-2024-001',
        consultationFee: 1000,
        address: 'Calle José Guadalupe Zuno 2227, 44150 Obrera Centro, Jalisco, México',
        passwordHash: bcrypt.hashSync('doctor123', 12),
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
    });
    console.log('Doctor seeded successfully');
  } else {
    console.log('Doctor already exists, skipping seed');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
