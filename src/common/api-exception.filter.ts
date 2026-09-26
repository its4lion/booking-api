import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';

const messages: Record<string, string> = {
  VALIDATION_ERROR: 'The request is invalid.',
  SLOT_NOT_FOUND: 'The requested slot was not found.',
  SLOT_UNAVAILABLE: 'This slot already has an active booking.',
  BOOKING_NOT_FOUND: 'The requested booking was not found.',
  NOT_FOUND: 'The requested resource was not found.',
  INTERNAL_ERROR: 'An unexpected error occurred.',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = messages.INTERNAL_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (status === HttpStatus.BAD_REQUEST) {
        code = 'VALIDATION_ERROR';
        message = typeof payload === 'string' ? payload : messages.VALIDATION_ERROR;
      } else if (status === HttpStatus.NOT_FOUND) {
        const raw = typeof payload === 'string' ? payload : (payload as { message?: string }).message;
        if (raw === 'SLOT_NOT_FOUND' || raw === 'BOOKING_NOT_FOUND') code = raw;
        else code = 'NOT_FOUND';
        message = messages[code];
      } else if (status === HttpStatus.CONFLICT) {
        code = 'SLOT_UNAVAILABLE';
        message = messages.SLOT_UNAVAILABLE;
      }
    } else if (exception && typeof exception === 'object' && 'status' in exception && (exception as { status?: number }).status === 400) {
      // body-parser reports malformed JSON as a plain error rather than a Nest HttpException.
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = 'Malformed JSON request body.';
    }

    if (status >= 500) console.error('Unhandled request failure', request.method, request.url, exception);
    response.status(status).json({ error: { code, message } });
  }
}
