import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateDeliveryZoneDto {
  @ApiProperty({
    description: 'Display name of the delivery zone',
    example: 'Lekki Phase 1 & Environs',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'List of neighborhoods or areas covered by this zone',
    example: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Chisco'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  areas: string[];

  @ApiProperty({
    description: 'Delivery fee in kobo (e.g., 150000 = ₦1,500)',
    example: 150000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  fee: number;

  @ApiPropertyOptional({
    description: 'Whether this delivery zone is currently active for checkout',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDeliveryZoneDto {
  @ApiPropertyOptional({
    description: 'Updated display name of the delivery zone',
    example: 'Lekki Phase 1 & Ikate',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated list of neighborhoods or areas covered by this zone',
    example: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Elegushi'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  areas?: string[];

  @ApiPropertyOptional({
    description: 'Updated delivery fee in kobo (e.g., 180000 = ₦1,800)',
    example: 180000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fee?: number;

  @ApiPropertyOptional({
    description: 'Whether this delivery zone is active for checkout',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

