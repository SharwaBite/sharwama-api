import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { GoogleLoginDto } from '../../auth/dto/google-login.dto';
import { LoginDto } from '../../auth/dto/login.dto';
import { RefreshTokenDto } from '../../auth/dto/refresh-token.dto';
import { RegisterDto } from '../../auth/dto/register.dto';
import {
  CreateDeliveryZoneDto,
  UpdateDeliveryZoneDto,
} from '../../zones/dto/delivery-zone.dto';

// ============================================================================
// 1. HEALTH ENDPOINTS
// ============================================================================

export const ApiHealthDocs = () =>
  applyDecorators(
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
// 2. AUTH ENDPOINTS (/api/v1/auth)
// ============================================================================

export const ApiRegisterDocs = () =>
  applyDecorators(
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
// 3. DELIVERY ZONES ENDPOINTS (/api/v1/delivery-zones & /api/v1/admin/delivery-zones)
// ============================================================================

export const ApiGetActiveZonesDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List all active delivery zones and fees (Public)',
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
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List all delivery zones including inactive ones (Admin)',
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
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a new delivery zone (Admin)' }),
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
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update a delivery zone fee, areas, or active status (Admin)',
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
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete a delivery zone (Admin)' }),
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

