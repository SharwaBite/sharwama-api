import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GoogleLoginDto } from '../../auth/dto/google-login.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { RegisterDto } from '../../auth/dto/register.dto';
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
