import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

// ============================================================================
// 1. MENU CATEGORY DTOs
// ============================================================================

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category display name',
    example: 'Signature Wraps',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description: 'Category banner or thumbnail URL',
    example: 'https://cdn.sharwama.ng/categories/signature-wraps.webp',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Display sort order (lower numbers appear first)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this category is visible on the public menu',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Updated category display name',
    example: 'Classic & Jumbo Wraps',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated category image URL',
    example: 'https://cdn.sharwama.ng/categories/classic-wraps.webp',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Updated display sort order',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this category is visible on the public menu',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================================================
// 2. OPTION & OPTION GROUP DTOs
// ============================================================================

export class CreateOptionDto {
  @ApiProperty({
    description: 'Option display name',
    example: 'Double Sausage',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description: 'Additional price in kobo (e.g., 50000 = +₦500, 0 = free)',
    example: 50000,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceDelta?: number;

  @ApiPropertyOptional({
    description: 'Optional image URL for this option',
    example: 'https://cdn.sharwama.ng/options/double-sausage.webp',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether this option is currently in stock',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order within the option group',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateOptionDto {
  @ApiPropertyOptional({
    description: 'Updated option display name',
    example: 'Extra Cheese Slice',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated price delta in kobo',
    example: 60000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceDelta?: number;

  @ApiPropertyOptional({
    description: 'Updated image URL',
    example: 'https://cdn.sharwama.ng/options/extra-cheese.webp',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Whether this option is currently in stock',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Updated sort order',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateOptionGroupDto {
  @ApiProperty({
    description: 'Option group name (e.g., Size, Protein, Extras, Spice Level)',
    example: 'Extras & Toppings',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({
    description: 'Whether the customer must select from this group',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum number of options the customer must pick',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelect?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of options the customer can pick',
    example: 3,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelect?: number;

  @ApiPropertyOptional({
    description: 'Display sort order for this option group',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Initial options to create inside this option group',
    type: [CreateOptionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  options?: CreateOptionDto[];
}

export class UpdateOptionGroupDto {
  @ApiPropertyOptional({
    description: 'Updated option group name',
    example: 'Choose Your Size',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether selection from this group is required',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Updated minimum selection count',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minSelect?: number;

  @ApiPropertyOptional({
    description: 'Updated maximum selection count',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSelect?: number;

  @ApiPropertyOptional({
    description: 'Updated sort order',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ============================================================================
// 3. MENU ITEM DTOs
// ============================================================================

export class CreateMenuItemDto {
  @ApiProperty({
    description: 'UUID of the parent menu category',
    example: '0195e4a0-0000-7000-8000-000000000100',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Menu item display name',
    example: 'Chicken Special Shawarma',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: 'Appetizing description of the menu item',
    example:
      'Grilled spiced chicken strips, double beef sausage, creamy garlic-pepper sauce, and crunchy cabbage wrapped in toasted Lebanese pita.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiProperty({
    description: 'Base price in kobo (e.g., 450000 = ₦4,500)',
    example: 450000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({
    description: '4:3 WebP food photo URL',
    example: 'https://cdn.sharwama.ng/items/chicken-special.webp',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Optional transparent cutout PNG/WebP URL for hero cards',
    example: 'https://cdn.sharwama.ng/items/chicken-special-cutout.webp',
  })
  @IsOptional()
  @IsString()
  cutoutUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether the item is in stock (false shows Sold Out badge)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the item is highlighted as a featured bestseller',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Display sort order within its category',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Optional option groups to create alongside the item',
    type: [CreateOptionGroupDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOptionGroupDto)
  optionGroups?: CreateOptionGroupDto[];
}

export class UpdateMenuItemDto {
  @ApiPropertyOptional({
    description: 'Updated parent category UUID',
    example: '0195e4a0-0000-7000-8000-000000000100',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Updated menu item name',
    example: 'Mixed Beef & Chicken Jumbo Shawarma',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated item description',
    example:
      'Flame-grilled beef and chicken strips with double sausage and signature house sauce.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Updated base price in kobo (e.g., 500000 = ₦5,000)',
    example: 500000,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({
    description: 'Updated food photo URL',
    example: 'https://cdn.sharwama.ng/items/mixed-jumbo.webp',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Updated transparent cutout URL',
    example: 'https://cdn.sharwama.ng/items/mixed-jumbo-cutout.webp',
  })
  @IsOptional()
  @IsString()
  cutoutUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Whether the item is in stock',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the item is featured',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Updated sort order',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ToggleAvailabilityDto {
  @ApiProperty({
    description:
      'Set to false to mark Sold Out immediately, or true to mark back in stock',
    example: false,
  })
  @IsBoolean()
  isAvailable: boolean;
}

// ============================================================================
// 4. STORE SETTINGS DTO
// ============================================================================

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

