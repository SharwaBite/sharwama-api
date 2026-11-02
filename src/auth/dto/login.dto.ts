import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Customer or admin email address',
    example: 'ada@sharwama.ng',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'Password123!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
