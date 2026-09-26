import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class UuidPipe implements PipeTransform<string> {
  transform(value: string) {
    if (!isUUID(value)) throw new BadRequestException('VALIDATION_ERROR');
    return value;
  }
}
