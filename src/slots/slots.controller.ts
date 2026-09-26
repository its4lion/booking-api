import { Controller, Get } from '@nestjs/common';
import { ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SlotsService } from './slots.service';

@ApiTags('slots')
@Controller('slots')
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  @Get()
  @ApiOperation({ summary: 'List currently available appointment slots', description: 'Returns slots with no active booking, ordered by startsAt and then id ascending.' })
  @ApiOkResponse({ schema: {
    type: 'object', required: ['slots'],
    properties: { slots: { type: 'array', items: { type: 'object', required: ['id', 'startsAt', 'endsAt'], properties: {
      id: { type: 'string', format: 'uuid' },
      startsAt: { type: 'string', format: 'date-time' },
      endsAt: { type: 'string', format: 'date-time' },
    } } } },
    example: { slots: [{ id: '8e790dc3-c277-4a8f-98b1-9072fc73a101', startsAt: '2032-04-21T13:00:00.000Z', endsAt: '2032-04-21T13:30:00.000Z' }] },
  } })
  @ApiInternalServerErrorResponse({ schema: { example: { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } } } })
  list() { return this.slots.listAvailable(); }
}
