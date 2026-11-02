import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'JWT refresh token issued during login or registration',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTk1ZTRhMC0wMDAwLTcwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJwaG9uZSI6IjA4MDMxMjM0NTY3Iiwicm9sZSI6IkNVU1RPTUVSIiwidHlwZSI6InJlZnJlc2gifQ.exampleSignature',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
