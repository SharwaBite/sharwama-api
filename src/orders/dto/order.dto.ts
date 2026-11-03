import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class OrderCustomerDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s-]+/g, '').trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'Phone number must be between 10 and 15 digits',
  })
  phone: string;

  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class OrderAddressDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  street: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(250)
  landmark?: string;
}

export class CreateOrderDto {
  @IsUUID()
  cartId: string;

  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer: OrderCustomerDto;

  /**
   * Required when the cart's orderType is DELIVERY; ignored for PICKUP.
   * Enforced in OrdersService because it depends on the cart state.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderAddressDto)
  address?: OrderAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class OrderAccessQueryDto {
  /**
   * Public tracking token returned when the order is created.
   * Lets guests view or cancel their order without logging in.
   */
  @IsOptional()
  @IsUUID('4')
  token?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

