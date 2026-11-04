import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GoogleLoginDto } from '../../auth/dto/google-login.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { RegisterDto } from '../../auth/dto/register.dto';
import {
  AddCartItemDto,
  ApplyCartPromoDto,
  MergeCartDto,
  SetCartDeliveryDto,
  UpdateCartItemDto,
} from '../../cart/dto/cart.dto';
import {
  CreateCategoryDto,
  CreateMenuItemDto,
  CreateOptionDto,
  CreateOptionGroupDto,
  ToggleAvailabilityDto,
  UpdateCategoryDto,
  UpdateMenuItemDto,
  UpdateOptionDto,
  UpdateOptionGroupDto,
} from '../../menu/dto/menu.dto';
import { CancelOrderDto, CreateOrderDto } from '../../orders/dto/order.dto';
import {
  CreatePromoDto,
  UpdatePromoDto,
  ValidatePromoDto,
} from '../../promos/dto/promo.dto';
import { UpdateStoreSettingsDto } from '../../store-settings/dto/store-settings.dto';
import {
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
} from '../../zones/dto/delivery-zone.dto';

// ============================================================================
// 1. HEALTH ENDPOINTS
// ============================================================================

export const ApiHealthDocs = () =>
  applyDecorators(
    ApiTags('Health'),
    ApiOperation({ summary: 'Health and database connectivity check' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'API and PostgreSQL database are healthy',
      schema: {
        example: {
          status: 'ok',
          service: 'sharwama-api',
          database: 'up',
          timestamp: '2026-11-02T11:45:00.000Z',
        },
      },
    }),
  );

// ============================================================================
// 2. AUTH ENDPOINTS (/api//auth)
// ============================================================================

export const ApiRegisterDocs = () =>
  applyDecorators(
    ApiTags('Auth'),
    ApiOperation({ summary: 'Register a new customer account' }),
    ApiBody({
      type: RegisterDto,
      examples: {
        customer: {
          summary: 'New customer registration',
          value: {
            name: 'Ada Obi',
            phone: '08031234567',
            email: 'ada@sharwama.ng',
            password: 'Password123!',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Customer registered and tokens issued',
      schema: {
        example: {
          user: {
            id: '0195e4a0-0000-7000-8000-000000000001',
            name: 'Ada Obi',
            phone: '08031234567',
            email: 'ada@sharwama.ng',
            role: 'CUSTOMER',
            createdAt: '2026-10-30T14:00:00.000Z',
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Phone or email already registered',
      schema: {
        example: {
          code: 'PHONE_ALREADY_EXISTS',
          message: 'An account with this phone number already exists',
        },
      },
    }),
  );

export const ApiLoginDocs = () =>
  applyDecorators(
    ApiTags('Auth'),
    ApiOperation({ summary: 'Log in with email and password' }),
    ApiBody({
      type: LoginDto,
      examples: {
        login: {
          summary: 'Login with email and password',
          value: {
            email: 'ada@sharwama.ng',
            password: 'Password123!',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Authenticated successfully',
      schema: {
        example: {
          user: {
            id: '0195e4a0-0000-7000-8000-000000000001',
            name: 'Ada Obi',
            phone: '08031234567',
            email: 'ada@sharwama.ng',
            role: 'CUSTOMER',
            createdAt: '2026-10-30T14:00:00.000Z',
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Invalid credentials',
      schema: {
        example: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      },
    }),
  );

export const ApiGoogleLoginDocs = () =>
  applyDecorators(
    ApiTags('Auth'),
    ApiOperation({ summary: 'Log in or sign up with a Google ID token' }),
    ApiBody({
      type: GoogleLoginDto,
      examples: {
        googleLogin: {
          summary: 'Google login payload',
          value: {
            idToken:
              'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJlbWFpbCI6ImFkYUBzaGFyd2FtYS5uZyIsIm5hbWUiOiJBZGEgT2JpIn0.exampleSignature',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Authenticated with Google successfully',
      schema: {
        example: {
          user: {
            id: '0195e4a0-0000-7000-8000-000000000001',
            name: 'Ada Obi',
            phone: null,
            email: 'ada@sharwama.ng',
            avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
            emailVerified: true,
            role: 'CUSTOMER',
            createdAt: '2026-10-30T14:00:00.000Z',
          },
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Invalid Google ID token',
      schema: {
        example: {
          code: 'INVALID_GOOGLE_TOKEN',
          message: 'Invalid Google token',
        },
      },
    }),
  );

export const ApiRefreshDocs = () =>
  applyDecorators(
    ApiTags('Auth'),
    ApiOperation({ summary: 'Exchange a refresh token for new tokens' }),
    ApiBody({
      type: RefreshTokenDto,
      examples: {
        refresh: {
          summary: 'Refresh token payload',
          value: {
            refreshToken:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMTk1ZTRhMC0wMDAwLTcwMDAtODAwMC0wMDAwMDAwMDAwMDEiLCJwaG9uZSI6IjA4MDMxMjM0NTY3Iiwicm9sZSI6IkNVU1RPTUVSIiwidHlwZSI6InJlZnJlc2gifQ.exampleSignature',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'New access and refresh tokens issued',
      schema: {
        example: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Invalid or expired refresh token',
      schema: {
        example: {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      },
    }),
  );

export const ApiGetMeDocs = () =>
  applyDecorators(
    ApiTags('Auth'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get the currently authenticated user profile' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Current user profile with saved addresses',
      schema: {
        example: {
          id: '0195e4a0-0000-7000-8000-000000000001',
          name: 'Ada Obi',
          phone: '08031234567',
          email: 'ada@sharwama.ng',
          avatarUrl: null,
          emailVerified: false,
          role: 'CUSTOMER',
          createdAt: '2026-10-30T14:00:00.000Z',
          updatedAt: '2026-10-30T14:00:00.000Z',
          addresses: [
            {
              id: '0195e4a0-0000-7000-8000-000000000010',
              userId: '0195e4a0-0000-7000-8000-000000000001',
              zoneId: '0195e4a0-0000-7000-8000-000000000020',
              label: 'Home',
              street: '14 Admiralty Way, Lekki Phase 1',
              landmark: 'Opposite Ebeano Supermarket',
              isDefault: true,
              zone: {
                id: '0195e4a0-0000-7000-8000-000000000020',
                name: 'Lekki Phase 1',
                fee: 150000,
                isActive: true,
              },
            },
          ],
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: 'Missing or invalid Bearer token',
      schema: {
        example: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
    }),
  );

// ============================================================================
// 3. DELIVERY ZONES ENDPOINTS (Public & Admin)
// ============================================================================

export const ApiGetActiveZonesDocs = () =>
  applyDecorators(
    ApiTags('Delivery Zones'),
    ApiOperation({
      summary: 'List all active delivery zones and fees',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'List of active delivery zones with fees in kobo',
      schema: {
        example: [
          {
            id: '0195e4a0-0000-7000-8000-000000000020',
            name: 'Lekki Phase 1 & Environs',
            areas: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Chisco'],
            fee: 150000,
            isActive: true,
          },
          {
            id: '0195e4a0-0000-7000-8000-000000000021',
            name: 'Victoria Island & Oniru',
            areas: ['Victoria Island', 'Oniru', 'Eko Atlantic'],
            fee: 200000,
            isActive: true,
          },
        ],
      },
    }),
  );

export const ApiGetAllZonesAdminDocs = () =>
  applyDecorators(
    ApiTags('Delivery Zones (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List all delivery zones including inactive ones',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'All delivery zones (active and inactive)',
      schema: {
        example: [
          {
            id: '0195e4a0-0000-7000-8000-000000000020',
            name: 'Lekki Phase 1 & Environs',
            areas: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Chisco'],
            fee: 150000,
            isActive: true,
          },
          {
            id: '0195e4a0-0000-7000-8000-000000000022',
            name: 'Ajah & Sangotedo',
            areas: ['Ajah', 'Abraham Adesanya', 'Sangotedo'],
            fee: 300000,
            isActive: false,
          },
        ],
      },
    }),
  );

export const ApiCreateZoneDocs = () =>
  applyDecorators(
    ApiTags('Delivery Zones (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a new delivery zone' }),
    ApiBody({
      type: CreateDeliveryZoneDto,
      examples: {
        lekki: {
          summary: 'Create Lekki Phase 1 delivery zone',
          value: {
            name: 'Lekki Phase 1 & Environs',
            areas: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Chisco'],
            fee: 150000,
            isActive: true,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Delivery zone created',
      schema: {
        example: {
          id: '0195e4a0-0000-7000-8000-000000000020',
          name: 'Lekki Phase 1 & Environs',
          areas: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Chisco'],
          fee: 150000,
          isActive: true,
        },
      },
    }),
  );

export const ApiUpdateZoneDocs = () =>
  applyDecorators(
    ApiTags('Delivery Zones (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update a delivery zone fee, areas, or active status',
    }),
    ApiParam({
      name: 'id',
      description: 'Delivery zone UUID',
      example: '0195e4a0-0000-7000-8000-000000000020',
    }),
    ApiBody({
      type: UpdateDeliveryZoneDto,
      examples: {
        updateFeeAndAreas: {
          summary: 'Update zone fee and areas',
          value: {
            name: 'Lekki Phase 1 & Ikate',
            areas: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Elegushi'],
            fee: 180000,
            isActive: true,
          },
        },
        toggleActive: {
          summary: 'Disable delivery zone temporarily',
          value: {
            isActive: false,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated delivery zone',
      schema: {
        example: {
          id: '0195e4a0-0000-7000-8000-000000000020',
          name: 'Lekki Phase 1 & Ikate',
          areas: ['Lekki Phase 1', 'Marwa', 'Ikate', 'Elegushi'],
          fee: 180000,
          isActive: true,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Delivery zone not found',
      schema: {
        example: {
          code: 'ZONE_NOT_FOUND',
          message: 'Delivery zone not found',
        },
      },
    }),
  );

export const ApiDeleteZoneDocs = () =>
  applyDecorators(
    ApiTags('Delivery Zones (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a delivery zone' }),
    ApiParam({
      name: 'id',
      description: 'Delivery zone UUID',
      example: '0195e4a0-0000-7000-8000-000000000020',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Delivery zone deleted',
      schema: {
        example: {
          deleted: true,
          id: '0195e4a0-0000-7000-8000-000000000020',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Delivery zone not found',
      schema: {
        example: {
          code: 'ZONE_NOT_FOUND',
          message: 'Delivery zone not found',
        },
      },
    }),
  );

// ============================================================================
// 4. MENU ENDPOINTS (Public & Admin)
// ============================================================================

export const ApiGetPublicMenuDocs = () =>
  applyDecorators(
    ApiTags('Menu'),
    ApiOperation({
      summary:
        'Get public menu categories, items, and options (cached for 1 minute)',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Public menu categories with items and option groups',
      schema: {
        example: {
          categories: [
            {
              id: '0195e4a0-0000-7000-8000-000000000100',
              name: 'Signature Wraps',
              imageUrl:
                'https://cdn.sharwama.ng/categories/signature-wraps.webp',
              sortOrder: 1,
              isActive: true,
              items: [
                {
                  id: '0195e4a0-0000-7000-8000-000000000200',
                  categoryId: '0195e4a0-0000-7000-8000-000000000100',
                  name: 'Chicken Special Shawarma',
                  description:
                    'Grilled spiced chicken strips, double beef sausage, creamy garlic-pepper sauce in toasted pita.',
                  basePrice: 450000,
                  imageUrl:
                    'https://cdn.sharwama.ng/items/chicken-special.webp',
                  cutoutUrl: null,
                  isAvailable: true,
                  isFeatured: true,
                  sortOrder: 1,
                  optionGroups: [
                    {
                      id: '0195e4a0-0000-7000-8000-000000000300',
                      itemId: '0195e4a0-0000-7000-8000-000000000200',
                      name: 'Extras & Toppings',
                      isRequired: false,
                      minSelect: 0,
                      maxSelect: 3,
                      sortOrder: 1,
                      options: [
                        {
                          id: '0195e4a0-0000-7000-8000-000000000400',
                          groupId: '0195e4a0-0000-7000-8000-000000000300',
                          name: 'Extra Sausage',
                          priceDelta: 50000,
                          imageUrl: null,
                          isAvailable: true,
                          sortOrder: 1,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    }),
  );

export const ApiGetMenuItemDocs = () =>
  applyDecorators(
    ApiTags('Menu'),
    ApiOperation({
      summary: 'Get a single menu item with its option groups and options',
    }),
    ApiParam({
      name: 'id',
      description: 'Menu item UUID',
      example: '0195e4a0-0000-7000-8000-000000000200',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Menu item details with option groups',
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: 'Menu item not found',
      schema: {
        example: {
          code: 'MENU_ITEM_NOT_FOUND',
          message: 'Menu item not found',
        },
      },
    }),
  );

export const ApiGetAdminMenuDocs = () =>
  applyDecorators(
    ApiTags('Menu Categories (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get full menu including inactive categories and sold-out items',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Complete menu tree for the admin menu manager',
    }),
  );

export const ApiCreateCategoryDocs = () =>
  applyDecorators(
    ApiTags('Menu Categories (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a menu category' }),
    ApiBody({
      type: CreateCategoryDto,
      examples: {
        wraps: {
          summary: 'Create Signature Wraps category',
          value: {
            name: 'Signature Wraps',
            imageUrl: 'https://cdn.sharwama.ng/categories/signature-wraps.webp',
            sortOrder: 1,
            isActive: true,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Category created',
    }),
  );

export const ApiUpdateCategoryDocs = () =>
  applyDecorators(
    ApiTags('Menu Categories (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update a menu category' }),
    ApiParam({
      name: 'id',
      description: 'Category UUID',
      example: '0195e4a0-0000-7000-8000-000000000100',
    }),
    ApiBody({
      type: UpdateCategoryDto,
      examples: {
        updateCategory: {
          summary: 'Rename or reorder category',
          value: {
            name: 'Classic & Jumbo Wraps',
            sortOrder: 1,
            isActive: true,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Category updated',
    }),
  );

export const ApiDeleteCategoryDocs = () =>
  applyDecorators(
    ApiTags('Menu Categories (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete an empty menu category' }),
    ApiParam({
      name: 'id',
      description: 'Category UUID',
      example: '0195e4a0-0000-7000-8000-000000000100',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Category deleted',
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: 'Category still contains menu items',
      schema: {
        example: {
          code: 'CATEGORY_NOT_EMPTY',
          message:
            'Cannot delete a category that still contains menu items. Move or delete its items first.',
        },
      },
    }),
  );

// ----------------------------------------------------------------------------
// 4B. MENU ITEMS (ADMIN)
// ----------------------------------------------------------------------------

export const ApiCreateMenuItemDocs = () =>
  applyDecorators(
    ApiTags('Menu Items (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Create a menu item with optional nested option groups and options',
    }),
    ApiBody({
      type: CreateMenuItemDto,
      examples: {
        chickenSpecial: {
          summary: 'Create Chicken Special Shawarma with Size & Extras options',
          value: {
            categoryId: '0195e4a0-0000-7000-8000-000000000100',
            name: 'Chicken Special Shawarma',
            description:
              'Grilled spiced chicken strips, double beef sausage, creamy garlic-pepper sauce, and crunchy cabbage wrapped in toasted Lebanese pita.',
            basePrice: 450000,
            imageUrl: 'https://cdn.sharwama.ng/items/chicken-special.webp',
            isAvailable: true,
            isFeatured: true,
            sortOrder: 1,
            optionGroups: [
              {
                name: 'Size',
                isRequired: true,
                minSelect: 1,
                maxSelect: 1,
                sortOrder: 1,
                options: [
                  { name: 'Regular', priceDelta: 0, sortOrder: 1 },
                  { name: 'Jumbo', priceDelta: 100000, sortOrder: 2 },
                ],
              },
              {
                name: 'Extras & Toppings',
                isRequired: false,
                minSelect: 0,
                maxSelect: 3,
                sortOrder: 2,
                options: [
                  { name: 'Extra Sausage', priceDelta: 50000, sortOrder: 1 },
                  { name: 'Extra Cheese', priceDelta: 60000, sortOrder: 2 },
                ],
              },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Menu item created with option groups',
    }),
  );

export const ApiUpdateMenuItemDocs = () =>
  applyDecorators(
    ApiTags('Menu Items (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update a menu item' }),
    ApiParam({
      name: 'id',
      description: 'Menu item UUID',
      example: '0195e4a0-0000-7000-8000-000000000200',
    }),
    ApiBody({
      type: UpdateMenuItemDto,
      examples: {
        updatePrice: {
          summary: 'Update item price and description',
          value: {
            name: 'Chicken Special Shawarma',
            basePrice: 480000,
            isFeatured: true,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Menu item updated',
    }),
  );

export const ApiToggleItemAvailabilityDocs = () =>
  applyDecorators(
    ApiTags('Menu Items (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Quick-toggle a menu item between Available and Sold Out',
    }),
    ApiParam({
      name: 'id',
      description: 'Menu item UUID',
      example: '0195e4a0-0000-7000-8000-000000000200',
    }),
    ApiBody({
      type: ToggleAvailabilityDto,
      examples: {
        markSoldOut: {
          summary: 'Mark item Sold Out',
          value: { isAvailable: false },
        },
        markInStock: {
          summary: 'Mark item back in stock',
          value: { isAvailable: true },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Item availability updated and menu cache invalidated',
      schema: {
        example: {
          id: '0195e4a0-0000-7000-8000-000000000200',
          name: 'Chicken Special Shawarma',
          isAvailable: false,
        },
      },
    }),
  );

export const ApiDeleteMenuItemDocs = () =>
  applyDecorators(
    ApiTags('Menu Items (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a menu item' }),
    ApiParam({
      name: 'id',
      description: 'Menu item UUID',
      example: '0195e4a0-0000-7000-8000-000000000200',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Menu item deleted',
    }),
  );

// ----------------------------------------------------------------------------
// 4C. MENU OPTION GROUPS (ADMIN)
// ----------------------------------------------------------------------------

export const ApiCreateOptionGroupDocs = () =>
  applyDecorators(
    ApiTags('Menu Option Groups (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Add an option group to a menu item',
    }),
    ApiParam({
      name: 'itemId',
      description: 'Menu item UUID',
      example: '0195e4a0-0000-7000-8000-000000000200',
    }),
    ApiBody({
      type: CreateOptionGroupDto,
      examples: {
        spiceLevel: {
          summary: 'Create required Spice Level option group',
          value: {
            name: 'Spice Level',
            isRequired: true,
            minSelect: 1,
            maxSelect: 1,
            sortOrder: 3,
            options: [
              { name: 'Mild', priceDelta: 0, sortOrder: 1 },
              { name: 'Medium Pepper', priceDelta: 0, sortOrder: 2 },
              { name: 'Extra Spicy', priceDelta: 0, sortOrder: 3 },
            ],
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Option group created',
    }),
  );

export const ApiUpdateOptionGroupDocs = () =>
  applyDecorators(
    ApiTags('Menu Option Groups (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update an option group' }),
    ApiParam({
      name: 'groupId',
      description: 'Option group UUID',
      example: '0195e4a0-0000-7000-8000-000000000300',
    }),
    ApiBody({
      type: UpdateOptionGroupDto,
      examples: {
        updateGroup: {
          summary: 'Update option group limits',
          value: {
            name: 'Extras & Toppings',
            isRequired: false,
            minSelect: 0,
            maxSelect: 4,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Option group updated',
    }),
  );

export const ApiDeleteOptionGroupDocs = () =>
  applyDecorators(
    ApiTags('Menu Option Groups (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete an option group' }),
    ApiParam({
      name: 'groupId',
      description: 'Option group UUID',
      example: '0195e4a0-0000-7000-8000-000000000300',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Option group deleted',
    }),
  );

// ----------------------------------------------------------------------------
// 4D. MENU OPTIONS (ADMIN)
// ----------------------------------------------------------------------------

export const ApiCreateOptionDocs = () =>
  applyDecorators(
    ApiTags('Menu Options (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Add an option to an option group' }),
    ApiParam({
      name: 'groupId',
      description: 'Option group UUID',
      example: '0195e4a0-0000-7000-8000-000000000300',
    }),
    ApiBody({
      type: CreateOptionDto,
      examples: {
        extraJalapeno: {
          summary: 'Add Jalapeño Peppers option (+₦400)',
          value: {
            name: 'Jalapeño Peppers',
            priceDelta: 40000,
            isAvailable: true,
            sortOrder: 3,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Option created',
    }),
  );

export const ApiUpdateOptionDocs = () =>
  applyDecorators(
    ApiTags('Menu Options (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update an option price, name, or availability',
    }),
    ApiParam({
      name: 'optionId',
      description: 'Option UUID',
      example: '0195e4a0-0000-7000-8000-000000000400',
    }),
    ApiBody({
      type: UpdateOptionDto,
      examples: {
        updateOption: {
          summary: 'Update option price and availability',
          value: {
            name: 'Double Beef Sausage',
            priceDelta: 60000,
            isAvailable: true,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Option updated',
    }),
  );

export const ApiDeleteOptionDocs = () =>
  applyDecorators(
    ApiTags('Menu Options (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete an option' }),
    ApiParam({
      name: 'optionId',
      description: 'Option UUID',
      example: '0195e4a0-0000-7000-8000-000000000400',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Option deleted',
    }),
  );

// ============================================================================
// 5. STORE SETTINGS ENDPOINTS (Public & Admin)
// ============================================================================

export const ApiGetStoreSettingsDocs = () =>
  applyDecorators(
    ApiTags('Store Settings'),
    ApiOperation({
      summary:
        'Get current store open/closed status, hours, minimum order, and contact details',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Store settings and evaluated open status',
      schema: {
        example: {
          isOpen: true,
          isOpenOverride: null,
          minOrderAmount: 300000,
          shopPhone: '08030000000',
          shopAddress: '14 Admiralty Way, Lekki Phase 1, Lagos',
          closedMessage: null,
          openingHours: {
            mon: { open: '10:00', close: '22:00', closed: false },
            tue: { open: '10:00', close: '22:00', closed: false },
            wed: { open: '10:00', close: '22:00', closed: false },
            thu: { open: '10:00', close: '22:00', closed: false },
            fri: { open: '10:00', close: '23:00', closed: false },
            sat: { open: '10:00', close: '23:00', closed: false },
            sun: { open: '12:00', close: '22:00', closed: false },
          },
        },
      },
    }),
  );

export const ApiUpdateStoreSettingsDocs = () =>
  applyDecorators(
    ApiTags('Store Settings (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Update store opening hours, manual Open/Closed override, or minimum order',
    }),
    ApiBody({
      type: UpdateStoreSettingsDto,
      examples: {
        updateAll: {
          summary: 'Configure shop details, minimum order, and weekly schedule',
          value: {
            isOpenOverride: null,
            minOrderAmount: 300000,
            shopPhone: '08030000000',
            shopAddress: '14 Admiralty Way, Lekki Phase 1, Lagos',
            openingHours: {
              mon: { open: '10:00', close: '22:00', closed: false },
              tue: { open: '10:00', close: '22:00', closed: false },
              wed: { open: '10:00', close: '22:00', closed: false },
              thu: { open: '10:00', close: '22:00', closed: false },
              fri: { open: '10:00', close: '23:00', closed: false },
              sat: { open: '10:00', close: '23:00', closed: false },
              sun: { open: '12:00', close: '22:00', closed: false },
            },
          },
        },
        forceClose: {
          summary: 'Manually close the shop immediately',
          value: {
            isOpenOverride: false,
          },
        },
        forceOpen: {
          summary: 'Manually force the shop open',
          value: {
            isOpenOverride: true,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated store settings and evaluated open status',
    }),
  );

// ============================================================================
// 6. PROMO CODES ENDPOINTS (/api/v1/promo & /api/v1/admin/promos)
// ============================================================================

export const ApiValidatePromoDocs = () =>
  applyDecorators(
    ApiTags('Promo Codes'),
    ApiOperation({
      summary:
        'Validate a promo code and optionally compute discount against a cart subtotal',
    }),
    ApiBody({
      type: ValidatePromoDto,
      schema: {
        example: {
          code: 'WELCOME10',
          subtotal: 820000,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Promo code is valid and discount calculated in kobo',
      schema: {
        example: {
          valid: true,
          id: '0195f1e2-c001-7000-8000-000000000501',
          code: 'WELCOME10',
          type: 'PERCENT',
          value: 10,
          minOrder: 500000,
          discount: 82000,
          expiresAt: '2026-12-31T23:59:59.000Z',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description:
        'Promo code is invalid, expired, inactive, exhausted, or below minOrder',
      schema: {
        example: {
          statusCode: 400,
          message:
            'Promo code "WELCOME10" requires a minimum order of ₦5,000.00',
          error: 'Bad Request',
        },
      },
    }),
  );

export const ApiGetAdminPromosDocs = () =>
  applyDecorators(
    ApiTags('Promo Codes (Admin)'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List all promo codes (active, inactive, and expired)',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'List of all promo codes',
      schema: {
        example: [
          {
            id: '0195f1e2-c001-7000-8000-000000000501',
            code: 'WELCOME10',
            type: 'PERCENT',
            value: 10,
            minOrder: 500000,
            maxUses: 200,
            usedCount: 14,
            expiresAt: '2026-12-31T23:59:59.000Z',
            isActive: true,
          },
          {
            id: '0195f1e2-c001-7000-8000-000000000502',
            code: 'SHAWARMA1K',
            type: 'FIXED',
            value: 100000,
            minOrder: 600000,
            maxUses: null,
            usedCount: 5,
            expiresAt: null,
            isActive: true,
          },
        ],
      },
    }),
  );

export const ApiCreatePromoDocs = () =>
  applyDecorators(
    ApiTags('Promo Codes (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a new promo code (PERCENT or FIXED)' }),
    ApiBody({
      type: CreatePromoDto,
      examples: {
        percentPromo: {
          summary: '10% off orders above ₦5,000',
          value: {
            code: 'WELCOME10',
            type: 'PERCENT',
            value: 10,
            minOrder: 500000,
            maxUses: 200,
            expiresAt: '2026-12-31T23:59:59.000Z',
            isActive: true,
          },
        },
        fixedPromo: {
          summary: '₦1,000 (100,000 kobo) off orders above ₦6,000',
          value: {
            code: 'SHAWARMA1K',
            type: 'FIXED',
            value: 100000,
            minOrder: 600000,
            maxUses: null,
            expiresAt: null,
            isActive: true,
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Created promo code',
      schema: {
        example: {
          id: '0195f1e2-c001-7000-8000-000000000501',
          code: 'WELCOME10',
          type: 'PERCENT',
          value: 10,
          minOrder: 500000,
          maxUses: 200,
          usedCount: 0,
          expiresAt: '2026-12-31T23:59:59.000Z',
          isActive: true,
        },
      },
    }),
  );

export const ApiUpdatePromoDocs = () =>
  applyDecorators(
    ApiTags('Promo Codes (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update an existing promo code' }),
    ApiParam({
      name: 'id',
      description: 'Promo Code UUID',
      example: '0195f1e2-c001-7000-8000-000000000501',
    }),
    ApiBody({
      type: UpdatePromoDto,
      schema: {
        example: {
          value: 15,
          minOrder: 550000,
          maxUses: 300,
          isActive: true,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated promo code',
      schema: {
        example: {
          id: '0195f1e2-c001-7000-8000-000000000501',
          code: 'WELCOME10',
          type: 'PERCENT',
          value: 15,
          minOrder: 550000,
          maxUses: 300,
          usedCount: 14,
          expiresAt: '2026-12-31T23:59:59.000Z',
          isActive: true,
        },
      },
    }),
  );

export const ApiDeletePromoDocs = () =>
  applyDecorators(
    ApiTags('Promo Codes (Admin)'),
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a promo code' }),
    ApiParam({
      name: 'id',
      description: 'Promo Code UUID',
      example: '0195f1e2-c001-7000-8000-000000000501',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Promo code deleted',
      schema: {
        example: {
          deleted: true,
          id: '0195f1e2-c001-7000-8000-000000000501',
        },
      },
    }),
  );

// ============================================================================
// 7. CART ENDPOINTS (/api/v1/cart)
// ============================================================================

const SAMPLE_CART_RESPONSE = {
  id: '0195f1e2-d001-7000-8000-000000000601',
  cartToken: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  userId: null,
  orderType: 'DELIVERY',
  zoneId: '0195f1e2-a1b2-7000-8000-000000000001',
  deliveryZone: {
    id: '0195f1e2-a1b2-7000-8000-000000000001',
    name: 'Lekki Phase 1 & Environs',
    fee: 150000,
    isActive: true,
  },
  promo: {
    id: '0195f1e2-c001-7000-8000-000000000501',
    code: 'WELCOME10',
    type: 'PERCENT',
    value: 10,
    minOrder: 500000,
    discount: 86000,
    valid: true,
  },
  items: [
    {
      id: '0195f1e2-d002-7000-8000-000000000602',
      menuItemId: '0195f1e2-b011-7000-8000-000000000201',
      name: 'Classic Chicken Shawarma',
      imageUrl: 'https://cdn.sharwama.ng/menu/classic-chicken.jpg',
      cutoutUrl: 'https://cdn.sharwama.ng/menu/classic-chicken-cutout.png',
      basePrice: 350000,
      optionsPrice: 80000,
      unitPrice: 430000,
      quantity: 2,
      lineTotal: 860000,
      notes: 'Extra spicy, light mayo please',
      selectedOptionIds: [
        '0195f1e2-b011-7000-8000-000000000401',
        '0195f1e2-b011-7000-8000-000000000402',
      ],
      selectedOptions: [
        {
          id: '0195f1e2-b011-7000-8000-000000000401',
          name: 'Double Sausage',
          groupId: '0195f1e2-b011-7000-8000-000000000301',
          groupName: 'Sausage Selection',
          priceDelta: 50000,
          isAvailable: true,
        },
        {
          id: '0195f1e2-b011-7000-8000-000000000402',
          name: 'Extra Cheese',
          groupId: '0195f1e2-b011-7000-8000-000000000302',
          groupName: 'Add-Ons',
          priceDelta: 30000,
          isAvailable: true,
        },
      ],
      isAvailable: true,
      unavailableOptions: [],
      issues: [],
    },
  ],
  itemCount: 2,
  subtotal: 860000,
  deliveryFee: 150000,
  discount: 86000,
  total: 924000,
  isStoreOpen: true,
  minOrderAmount: 300000,
  meetsMinOrder: true,
  hasUnavailableItems: false,
  canCheckout: true,
  warnings: [],
  updatedAt: '2026-11-02T17:30:00.000Z',
};

const OPTIONAL_CART_TOKEN_HEADER = ApiHeader({
  name: 'X-Cart-Token',
  required: false,
  description:
    'Guest cart token (optional if sent via cart_token httpOnly cookie or authenticated via Bearer token)',
  example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
});

export const ApiGetCartDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({
      summary:
        'Get the current cart, re-priced and re-validated (sold-out or changed items flagged)',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description:
        'Current cart with server-calculated prices, availability flags, and totals',
      schema: {
        example: SAMPLE_CART_RESPONSE,
      },
    }),
  );

export const ApiAddCartItemDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({
      summary:
        'Add an item to the cart (issues X-Cart-Token header and cart_token httpOnly cookie on first guest item)',
    }),
    ApiBody({
      type: AddCartItemDto,
      schema: {
        example: {
          menuItemId: '0195f1e2-b011-7000-8000-000000000201',
          optionIds: [
            '0195f1e2-b011-7000-8000-000000000401',
            '0195f1e2-b011-7000-8000-000000000402',
          ],
          quantity: 2,
          notes: 'Extra spicy, light mayo please',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Updated cart with newly added item and server-side totals',
      schema: {
        example: SAMPLE_CART_RESPONSE,
      },
    }),
  );

export const ApiUpdateCartItemDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({
      summary: 'Change quantity, selected options, or notes for a cart line',
    }),
    ApiParam({
      name: 'itemId',
      description: 'Cart Item UUID',
      example: '0195f1e2-d002-7000-8000-000000000602',
    }),
    ApiBody({
      type: UpdateCartItemDto,
      schema: {
        example: {
          quantity: 3,
          optionIds: ['0195f1e2-b011-7000-8000-000000000401'],
          notes: 'No onions please',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated cart with re-calculated prices and totals',
      schema: {
        example: SAMPLE_CART_RESPONSE,
      },
    }),
  );

export const ApiRemoveCartItemDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({ summary: 'Remove one line item from the cart' }),
    ApiParam({
      name: 'itemId',
      description: 'Cart Item UUID',
      example: '0195f1e2-d002-7000-8000-000000000602',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated cart after removing the item line',
      schema: {
        example: SAMPLE_CART_RESPONSE,
      },
    }),
  );

export const ApiClearCartDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({ summary: 'Clear all items and promo code from the cart' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Cleared cart',
      schema: {
        example: {
          ...SAMPLE_CART_RESPONSE,
          promo: null,
          items: [],
          itemCount: 0,
          subtotal: 0,
          discount: 0,
          total: 150000,
          meetsMinOrder: false,
          canCheckout: false,
        },
      },
    }),
  );

export const ApiSetCartDeliveryDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({
      summary:
        'Set order fulfillment type (DELIVERY or PICKUP) and delivery zone ID so delivery fee is calculated',
    }),
    ApiBody({
      type: SetCartDeliveryDto,
      examples: {
        delivery: {
          summary: 'Set to DELIVERY with a zone ID',
          value: {
            type: 'DELIVERY',
            zoneId: '0195f1e2-a1b2-7000-8000-000000000001',
          },
        },
        pickup: {
          summary: 'Set to PICKUP (zero delivery fee)',
          value: {
            type: 'PICKUP',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated cart with delivery fee and total recalculated',
      schema: {
        example: SAMPLE_CART_RESPONSE,
      },
    }),
  );

export const ApiApplyCartPromoDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({ summary: 'Apply a promo code to the current cart' }),
    ApiBody({
      type: ApplyCartPromoDto,
      schema: {
        example: {
          code: 'WELCOME10',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated cart with promo code applied and discount deducted',
      schema: {
        example: SAMPLE_CART_RESPONSE,
      },
    }),
  );

export const ApiRemoveCartPromoDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({ summary: 'Remove the applied promo code from the cart' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Updated cart with promo code removed',
      schema: {
        example: {
          ...SAMPLE_CART_RESPONSE,
          promo: null,
          discount: 0,
          total: 1010000,
        },
      },
    }),
  );

export const ApiMergeCartDocs = () =>
  applyDecorators(
    ApiTags('Cart'),
    ApiBearerAuth(),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({
      summary:
        'After login, merge the guest cart into the authenticated user cart',
    }),
    ApiBody({
      type: MergeCartDto,
      required: false,
      schema: {
        example: {
          guestCartToken: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Merged authenticated user cart',
      schema: {
        example: {
          ...SAMPLE_CART_RESPONSE,
          userId: '0195f1e2-0001-7000-8000-000000000099',
        },
      },
    }),
  );

// ============================================================================
// 8. ORDERS ENDPOINTS (/api/v1/orders)
// ============================================================================

const SAMPLE_ORDER_OBJECT = {
  id: '0195f1e2-e001-7000-8000-000000000701',
  orderNumber: 1001,
  publicToken: '4a89f210-91c4-4e1a-b833-7c5128a9f001',
  idempotencyKey: 'checkout-order-20261103-001',
  userId: null,
  type: 'DELIVERY',
  status: 'PENDING_PAYMENT',
  customerName: 'Ada Obi',
  customerPhone: '08031234567',
  customerEmail: 'ada@sharwama.ng',
  notes: 'Please call when at the gate',
  subtotal: 860000,
  deliveryFee: 150000,
  discount: 86000,
  total: 924000,
  zoneId: '0195f1e2-a1b2-7000-8000-000000000001',
  deliveryZoneName: 'Lekki Phase 1 & Environs',
  deliveryStreet: '14 Admiralty Way, Lekki Phase 1',
  deliveryLandmark: 'Opposite Ebeano Supermarket',
  promoCodeId: '0195f1e2-c001-7000-8000-000000000501',
  promoCode: 'WELCOME10',
  riderName: null,
  riderPhone: null,
  placedAt: '2026-11-03T18:00:00.000Z',
  expiresAt: '2026-11-03T18:30:00.000Z',
  paidAt: null,
  updatedAt: '2026-11-03T18:00:00.000Z',
  items: [
    {
      id: '0195f1e2-e002-7000-8000-000000000702',
      orderId: '0195f1e2-e001-7000-8000-000000000701',
      menuItemId: '0195f1e2-b011-7000-8000-000000000201',
      name: 'Classic Chicken Shawarma',
      unitPrice: 430000,
      quantity: 2,
      lineTotal: 860000,
      selectedOptions: [
        {
          id: '0195f1e2-b011-7000-8000-000000000401',
          name: 'Double Sausage',
          groupId: '0195f1e2-b011-7000-8000-000000000301',
          groupName: 'Sausage Selection',
          priceDelta: 50000,
          isAvailable: true,
        },
        {
          id: '0195f1e2-b011-7000-8000-000000000402',
          name: 'Extra Cheese',
          groupId: '0195f1e2-b011-7000-8000-000000000302',
          groupName: 'Add-Ons',
          priceDelta: 30000,
          isAvailable: true,
        },
      ],
      notes: 'Extra spicy, light mayo please',
    },
  ],
  payments: [
    {
      id: '0195f1e2-f001-7000-8000-000000000801',
      orderId: '0195f1e2-e001-7000-8000-000000000701',
      provider: 'bachs',
      providerReference: 'chk_2N3o4P5q6R7s8T9u',
      checkoutUrl: 'https://checkout.bachs.io/c/V8xQ2mZpLj9RfTa',
      status: 'PENDING',
      amount: 924000,
      paidAmount: null,
      currency: 'NGN',
      needsReview: false,
      reviewReason: null,
      paidAt: null,
      createdAt: '2026-11-03T18:00:01.000Z',
    },
  ],
  history: [
    {
      id: '0195f1e2-e003-7000-8000-000000000703',
      orderId: '0195f1e2-e001-7000-8000-000000000701',
      fromStatus: null,
      toStatus: 'PENDING_PAYMENT',
      source: 'customer',
      changedById: null,
      note: 'Order placed by customer',
      createdAt: '2026-11-03T18:00:00.000Z',
    },
  ],
};

export const ApiCreateOrderDocs = () =>
  applyDecorators(
    ApiTags('Orders'),
    ApiBearerAuth(),
    ApiHeader({
      name: 'Idempotency-Key',
      required: true,
      description:
        'Unique key per checkout attempt (8-255 chars) so retries never create duplicate orders or charges',
      example: 'checkout-order-20261103-001',
    }),
    OPTIONAL_CART_TOKEN_HEADER,
    ApiOperation({
      summary:
        'Create an order from the current cart and initialize a Bachs payment checkout session',
    }),
    ApiBody({
      type: CreateOrderDto,
      examples: {
        deliveryOrder: {
          summary: 'Delivery order checkout',
          value: {
            cartId: '0195f1e2-d001-7000-8000-000000000601',
            customer: {
              name: 'Ada Obi',
              phone: '08031234567',
              email: 'ada@sharwama.ng',
            },
            address: {
              street: '14 Admiralty Way, Lekki Phase 1',
              landmark: 'Opposite Ebeano Supermarket',
            },
            notes: 'Please call when at the gate',
          },
        },
        pickupOrder: {
          summary: 'Pickup order checkout (no address needed)',
          value: {
            cartId: '0195f1e2-d001-7000-8000-000000000601',
            customer: {
              name: 'Ada Obi',
              phone: '08031234567',
              email: 'ada@sharwama.ng',
            },
            notes: 'Picking up in 25 minutes',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description:
        'Order snapshotted from cart and Bachs checkout URL generated',
      schema: {
        example: {
          order: SAMPLE_ORDER_OBJECT,
          payment: {
            paymentId: '0195f1e2-f001-7000-8000-000000000801',
            checkoutId: 'chk_2N3o4P5q6R7s8T9u',
            checkoutUrl: 'https://checkout.bachs.io/c/V8xQ2mZpLj9RfTa',
            status: 'PENDING',
          },
          idempotentReplay: false,
        },
      },
    }),
  );

export const ApiGetMyOrdersDocs = () =>
  applyDecorators(
    ApiTags('Orders'),
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List order history for the currently authenticated customer',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Customer order history (newest first)',
      schema: {
        example: [SAMPLE_ORDER_OBJECT],
      },
    }),
  );

export const ApiGetOrderDocs = () =>
  applyDecorators(
    ApiTags('Orders'),
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Get order details and status history by Order ID or guest publicToken',
    }),
    ApiParam({
      name: 'idOrToken',
      description: 'Order UUID or guest publicToken UUID',
      example: '0195f1e2-e001-7000-8000-000000000701',
    }),
    ApiQuery({
      name: 'token',
      required: false,
      description:
        'Guest publicToken (optional if idOrToken is already the publicToken or if authenticated as the order owner)',
      example: '4a89f210-91c4-4e1a-b833-7c5128a9f001',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Full order details, items, payments, and status history',
      schema: {
        example: SAMPLE_ORDER_OBJECT,
      },
    }),
  );

export const ApiCancelOrderDocs = () =>
  applyDecorators(
    ApiTags('Orders'),
    ApiBearerAuth(),
    ApiOperation({
      summary:
        'Cancel an order (customers may cancel before PREPARING; admins may cancel before delivery)',
    }),
    ApiParam({
      name: 'id',
      description: 'Order UUID',
      example: '0195f1e2-e001-7000-8000-000000000701',
    }),
    ApiQuery({
      name: 'token',
      required: false,
      description: 'Guest publicToken (required when cancelling as a guest)',
      example: '4a89f210-91c4-4e1a-b833-7c5128a9f001',
    }),
    ApiBody({
      type: CancelOrderDto,
      required: false,
      schema: {
        example: {
          reason: 'Ordered the wrong delivery zone by mistake',
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Order cancelled and recorded in status history',
      schema: {
        example: {
          ...SAMPLE_ORDER_OBJECT,
          status: 'CANCELLED',
        },
      },
    }),
  );

// ============================================================================
// 9. PAYMENTS & WEBHOOKS ENDPOINTS (/api/v1/webhooks/bachs)
// ============================================================================

export const ApiBachsWebhookDocs = () =>
  applyDecorators(
    ApiTags('Payments'),
    ApiOperation({
      summary: 'Receive and process incoming Bachs webhook events',
      description:
        'Verifies HMAC-SHA256 signature (X-Bachs-Signature-V2 or X-Bachs-Signature + X-Bachs-Timestamp) against the raw request body, deduplicates via WebhookEvent, and marks orders PAID.',
    }),
    ApiHeader({
      name: 'X-Bachs-Signature-V2',
      required: false,
      description:
        'Preferred Bachs V2 signature header: t={timestamp},v1={signature}',
      example:
        't=1776780000,v1=5d41402abc4b2a76b9719d911017c592',
    }),
    ApiHeader({
      name: 'X-Bachs-Signature',
      required: false,
      description: 'Fallback Bachs V1 HMAC-SHA256 hex digest',
      example: '5d41402abc4b2a76b9719d911017c592',
    }),
    ApiHeader({
      name: 'X-Bachs-Timestamp',
      required: false,
      description: 'Unix timestamp (seconds) when the webhook was sent',
      example: '1776780000',
    }),
    ApiBody({
      description:
        'Raw JSON event payload sent by Bachs (collection.succeeded, checkout.completed, or collection.failed)',
      schema: {
        type: 'object',
        example: {
          id: 'evt_3ab4e0d5d27445cf8a52ab3d8cb8f0b1',
          type: 'collection.succeeded',
          created_at: '2026-11-03T18:02:18.402Z',
          organization_id: 'acct_7KpQ2mNv4XbR9dLc',
          data: {
            charge_id: 'ch_1a2b3c4d5e6f',
            checkout_id: 'chk_2N3o4P5q6R7s8T9u',
            reference: '0195f1e2-e001-7000-8000-000000000701',
            status: 'SUCCEEDED',
            amount: '9240.00',
            currency: 'NGN',
          },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Webhook verified and processed',
      schema: {
        example: {
          received: true,
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: 'Invalid or expired webhook signature',
      schema: {
        example: {
          code: 'BAD_REQUEST',
          message: 'Invalid or expired Bachs webhook signature',
        },
      },
    }),
  );


