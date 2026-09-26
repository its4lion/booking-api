import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiNotFoundResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { UuidPipe } from '../common/uuid.pipe';
import { CreateBookingDto } from './create-booking.dto';
import { BookingsService } from './bookings.service';

const errorSchema = (code: string, message: string) => ({ schema: {
  type: 'object', required: ['error'], properties: { error: {
    type: 'object', required: ['code', 'message'], properties: {
      code: { type: 'string', enum: [code] }, message: { type: 'string', minLength: 1 },
    },
  } }, example: { error: { code, message } },
} });

const bookingSchema = (status: 'active' | 'cancelled') => ({
  type: 'object', required: ['booking'], properties: { booking: {
    type: 'object', required: ['id', 'slotId', 'customerName', 'customerEmail', 'status'], properties: {
      id: { type: 'string', format: 'uuid' }, slotId: { type: 'string', format: 'uuid' },
      customerName: { type: 'string' }, customerEmail: { type: 'string', format: 'email' },
      status: { type: 'string', enum: [status] },
    },
  } },
});

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Book an available slot', description: 'All fields are required. Name and email are trimmed before validation/storage; name must be non-empty and email syntactically valid.' })
  @ApiCreatedResponse({ schema: {
    ...bookingSchema('active'),
    example: { booking: { id: '21fdb64f-cafc-4a14-8ac4-86cf378d29a1', slotId: '8e790dc3-c277-4a8f-98b1-9072fc73a101', customerName: 'Morgan Chen', customerEmail: 'morgan.chen@sample.net', status: 'active' } },
  } })
  @ApiBadRequestResponse(errorSchema('VALIDATION_ERROR', 'Invalid or missing fields, or malformed JSON.'))
  @ApiNotFoundResponse(errorSchema('SLOT_NOT_FOUND', 'The requested slot was not found.'))
  @ApiConflictResponse(errorSchema('SLOT_UNAVAILABLE', 'This slot already has an active booking.'))
  @ApiInternalServerErrorResponse(errorSchema('INTERNAL_ERROR', 'An unexpected error occurred.'))
  async create(@Body() dto: CreateBookingDto) { return this.bookings.create(dto); }

  @Delete(':bookingId')
  @ApiOperation({ summary: 'Cancel a booking', description: 'Cancellation is idempotent: repeating it returns the same cancelled booking and emits no additional event. Cancelled bookings remain addressable.' })
  @ApiParam({ name: 'bookingId', type: 'string', format: 'uuid', required: true, description: 'UUID of the booking to cancel.' })
  @ApiOkResponse({ description: 'Booking cancelled or already cancelled.', schema: {
    ...bookingSchema('cancelled'),
    example: { booking: { id: '21fdb64f-cafc-4a14-8ac4-86cf378d29a1', slotId: '8e790dc3-c277-4a8f-98b1-9072fc73a101', customerName: 'Morgan Chen', customerEmail: 'morgan.chen@sample.net', status: 'cancelled' } },
  } })
  @ApiBadRequestResponse(errorSchema('VALIDATION_ERROR', 'Booking ID must be a UUID.'))
  @ApiNotFoundResponse(errorSchema('BOOKING_NOT_FOUND', 'The requested booking was not found.'))
  @ApiInternalServerErrorResponse(errorSchema('INTERNAL_ERROR', 'An unexpected error occurred.'))
  async cancel(@Param('bookingId', UuidPipe) bookingId: string) { return this.bookings.cancel(bookingId); }
}
