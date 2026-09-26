import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const slots = [
  { id: '8e790dc3-c277-4a8f-98b1-9072fc73a101', startsAt: '2032-04-21T13:00:00.000Z', endsAt: '2032-04-21T13:30:00.000Z' },
  { id: '8e790dc3-c277-4a8f-98b1-9072fc73a102', startsAt: '2032-04-21T13:30:00.000Z', endsAt: '2032-04-21T14:00:00.000Z' },
  { id: '8e790dc3-c277-4a8f-98b1-9072fc73a103', startsAt: '2032-04-21T14:00:00.000Z', endsAt: '2032-04-21T14:30:00.000Z' },
];

async function main() {
  for (const slot of slots) {
    await prisma.slot.upsert({
      where: { id: slot.id },
      update: { startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) },
      create: { ...slot, startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) },
    });
  }
}

main().finally(() => prisma.$disconnect());
