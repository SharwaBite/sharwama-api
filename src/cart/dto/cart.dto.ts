import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { OrderType } from '../../generated/prisma/client';

export class AddCartItemDto {
  @ApiProperty({
    example: '0195f1e2-b011-7000-8000-000000000201',
    description: 'ID of the menu item to add to the cart',
  })
  @IsUUID()
  menuItemId: string;

  @ApiPropertyOptional({
    example: [
      '0195f1e2-b011-7000-8000-000000000401',
      '0195f1e2-b011-7000-8000-000000000402',
    ],
    description: 'Selected option IDs for this menu item',
    type: [String],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  optionIds?: string[];

  @ApiProperty({
    example: 2,
    description: 'Quantity of this item line (1 to 50)',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Extra spicy, light mayo please',
    nullable: true,
    description: 'Special preparation notes for this item line',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'Updated quantity for this cart line (1 to 50)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;

  @ApiPropertyOptional({
    example: ['0195f1e2-b011-7000-8000-000000000401'],
    description: 'Updated list of selected option IDs for this cart line',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  optionIds?: string[];

  @ApiPropertyOptional({
    example: 'No onions please',
    nullable: true,
    description: 'Updated special preparation notes (null to clear)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class SetCartDeliveryDto {
  @ApiProperty({
    enum: OrderType,
    example: OrderType.DELIVERY,
    description: 'Order fulfillment type: DELIVERY or PICKUP',
  })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional({
    example: '0195f1e2-a1b2-7000-8000-000000000001',
    nullable: true,
    description:
      'Delivery zone ID (required to calculate delivery fee when type is DELIVERY; ignored/cleared when PICKUP)',
  })
  @IsOptional()
  @IsUUID()
  zoneId?: string | null;
}

export class ApplyCartPromoDto {
  @ApiProperty({
    example: 'WELCOME10',
    description: 'Promo code to apply to the cart (case-insensitive)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;
}

export class MergeCartDto {
  @ApiPropertyOptional({
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    description:
      'Optional guest cart token to merge (if omitted, read from X-Cart-Token header or cart_token cookie)',
  })
  @IsOptional()
  @IsString()
  guestCartToken?: string;
}

