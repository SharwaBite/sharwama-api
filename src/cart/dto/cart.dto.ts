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
  @IsUUID()
  menuItemId: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  optionIds?: string[];

  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class UpdateCartItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  quantity?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  optionIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notes?: string | null;
}

export class SetCartDeliveryDto {
  @IsEnum(OrderType)
  type: OrderType;

  @IsOptional()
  @IsUUID()
  zoneId?: string | null;
}

export class ApplyCartPromoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;
}

export class MergeCartDto {
  @IsOptional()
  @IsString()
  guestCartToken?: string;
}
