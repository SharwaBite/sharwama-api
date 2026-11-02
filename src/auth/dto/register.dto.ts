import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Customer full name',
    example: 'Ada Obi',
    maxLength: 100,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Customer phone number (10 to 15 digits)',
    example: '08031234567',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s-]+/g, '').trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'Phone number must be between 10 and 15 digits',
  })
  phone: string;

  @ApiPropertyOptional({
    description: 'Customer email address (optional)',
    example: 'ada@sharwama.ng',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Account password (minimum 8 characters)',
    example: 'Password123!',
    minLength: 8,
    maxLength: 100,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
