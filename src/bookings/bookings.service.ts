import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { BookingGateway } from './bookings.gateway';
import { CreateBookingDto } from './create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService, private readonly gateway: BookingGateway) {}

  async create(dto: CreateBookingDto) {
    const slot = await this.prisma.slot.findUnique({ where: { id: dto.slotId }, select: { id: true } });
    if (!slot) throw new NotFoundException('SLOT_NOT_FOUND');

    let booking;
    try {
      booking = await this.prisma.booking.create({
        data: { slotId: dto.slotId, customerName: dto.customerName, customerEmail: dto.customerEmail },
        select: { id: true, slotId: true, customerName: true, customerEmail: true, status: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('SLOT_UNAVAILABLE');
      }
      throw error;
    }
    // Emitted only after Prisma's autocommitted INSERT succeeds.
    this.gateway.booked(booking.slotId, booking.id);
    return { booking };
  }

  async cancel(id: string) {
    const existing = await this.prisma.booking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('BOOKING_NOT_FOUND');

    if (existing.status === 'active') {
      const changed = await this.prisma.booking.updateMany({ where: { id, status: 'active' }, data: { status: 'cancelled' } });
      const booking = await this.prisma.booking.findUniqueOrThrow({
        where: { id },
        select: { id: true, slotId: true, customerName: true, customerEmail: true, status: true },
      });
      if (changed.count === 1) this.gateway.released(booking.slotId, booking.id);
      return { booking };
    }

    return { booking: { id: existing.id, slotId: existing.slotId, customerName: existing.customerName, customerEmail: existing.customerEmail, status: existing.status } };
  }
}
