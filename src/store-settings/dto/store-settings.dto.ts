import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional({
    description:
      'Manual override: true = force Open, false = force Closed, null = follow weekly openingHours schedule',
    example: null,
    nullable: true,
  })
  @IsOptional()
  @IsBoolean()
  isOpenOverride?: boolean | null;

  @ApiPropertyOptional({
    description: 'Minimum order subtotal in kobo (e.g., 300000 = ₦3,000)',
    example: 300000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'Shop contact phone / WhatsApp number for customers',
    example: '08030000000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  shopPhone?: string | null;

  @ApiPropertyOptional({
    description: 'Physical shop address for customer pickup',
    example: '14 Admiralty Way, Lekki Phase 1, Lagos',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  shopAddress?: string | null;

  @ApiPropertyOptional({
    description:
      'Weekly opening hours schedule keyed by day (mon..sun) in Africa/Lagos time (HH:mm)',
    example: {
      mon: { open: '10:00', close: '22:00', closed: false },
      tue: { open: '10:00', close: '22:00', closed: false },
      wed: { open: '10:00', close: '22:00', closed: false },
      thu: { open: '10:00', close: '22:00', closed: false },
      fri: { open: '10:00', close: '23:00', closed: false },
      sat: { open: '10:00', close: '23:00', closed: false },
      sun: { open: '12:00', close: '22:00', closed: false },
    },
  })
  @IsOptional()
  @IsObject()
  openingHours?: Record<
    string,
    { open: string; close: string; closed?: boolean }
  >;
}

