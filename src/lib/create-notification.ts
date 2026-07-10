import { prisma } from '@/lib/prisma';

export async function createNotification(params: {
  userId: string;
  userRole: string;
  type: string;
  title: string;
  message: string;
}) {
  return prisma.notification.create({ data: params });
}
