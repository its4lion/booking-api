import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailable() {
    const slots = await this.prisma.slot.findMany({
      where: { bookings: { none: { status: 'active' } } },
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      select: { id: true, startsAt: true, endsAt: true },
    });
    return { slots };
  }
}
