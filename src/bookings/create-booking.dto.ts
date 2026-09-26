import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid', example: '11111111-1111-4111-8111-111111111111' })
  @IsUUID()
  slotId!: string;

  @ApiProperty({ type: 'string', example: 'Morgan Chen', minLength: 1, maxLength: 200, required: true })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  customerName!: string;

  @ApiProperty({ type: 'string', format: 'email', example: 'morgan.chen@sample.net', maxLength: 320, required: true })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsEmail()
  @MaxLength(320)
  customerEmail!: string;
}
