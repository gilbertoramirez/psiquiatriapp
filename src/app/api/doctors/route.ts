import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const doctors = await prisma.doctor.findMany({
    select: {
      id: true,
      name: true,
      specialty: true,
      consultationFee: true,
      availableHours: true,
      modalityByDay: true,
      address: true,
    },
  });

  return NextResponse.json(doctors);
}
