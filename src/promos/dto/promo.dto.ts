import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PromoType } from '../../generated/prisma/client';

export class ValidatePromoDto {
  @ApiProperty({
    example: 'WELCOME10',
    description: 'Promo code to validate (case-insensitive)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    example: 820000,
    description:
      'Optional cart subtotal in kobo (e.g. 820000 = ₦8,200.00) to verify minOrder and compute discount',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  subtotal?: number;
}

export class CreatePromoDto {
  @ApiProperty({
    example: 'SHAWARMA20',
    description: 'Unique promo code (stored uppercase)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    enum: PromoType,
    example: PromoType.PERCENT,
    description:
      'Discount type: PERCENT (1-100 percentage) or FIXED (amount in kobo)',
  })
  @IsEnum(PromoType)
  type: PromoType;

  @ApiProperty({
    example: 20,
    description:
      'For PERCENT: percentage integer (e.g. 20 = 20% off). For FIXED: amount in kobo (e.g. 100000 = ₦1,000.00 off).',
  })
  @IsInt()
  @Min(1)
  value: number;

  @ApiPropertyOptional({
    example: 500000,
    description:
      'Minimum order subtotal in kobo required to use this promo (e.g. 500000 = ₦5,000.00)',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrder?: number;

  @ApiPropertyOptional({
    example: 100,
    nullable: true,
    description:
      'Maximum total redemptions allowed across all orders (null for unlimited)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    nullable: true,
    description: 'ISO 8601 expiration timestamp (null for no expiration)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the promo code is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePromoDto {
  @ApiPropertyOptional({
    example: 'SHAWARMA25',
    description: 'Updated unique promo code (stored uppercase)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional({
    enum: PromoType,
    example: PromoType.PERCENT,
    description:
      'Discount type: PERCENT (1-100 percentage) or FIXED (amount in kobo)',
  })
  @IsOptional()
  @IsEnum(PromoType)
  type?: PromoType;

  @ApiPropertyOptional({
    example: 25,
    description:
      'For PERCENT: percentage integer (1-100). For FIXED: amount in kobo.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  value?: number;

  @ApiPropertyOptional({
    example: 600000,
    description: 'Minimum order subtotal in kobo required to use this promo',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minOrder?: number;

  @ApiPropertyOptional({
    example: 250,
    nullable: true,
    description: 'Maximum total redemptions allowed (null for unlimited)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number | null;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.000Z',
    nullable: true,
    description: 'ISO 8601 expiration timestamp (null for no expiration)',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the promo code is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

