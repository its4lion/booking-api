import { Module } from '@nestjs/common';
import { BookingGateway } from './bookings.gateway';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

@Module({ controllers: [BookingsController], providers: [BookingsService, BookingGateway] })
export class BookingsModule {}
