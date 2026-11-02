import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, JwtAuthGuard } from '../common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiBody({
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
  })
  @ApiResponse({
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
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Phone or email already registered',
    schema: {
      example: {
        code: 'PHONE_ALREADY_EXISTS',
        message: 'An account with this phone number already exists',
      },
    },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in with phone or email and password' })
  @ApiBody({
    type: LoginDto,
    examples: {
      byPhone: {
        summary: 'Login with phone number',
        value: {
          phone: '08031234567',
          password: 'Password123!',
        },
      },
      byEmail: {
        summary: 'Login with email address',
        value: {
          email: 'ada@sharwama.ng',
          password: 'Password123!',
        },
      },
    },
  })
  @ApiResponse({
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
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
    schema: {
      example: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid phone/email or password',
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Exchange a refresh token for new tokens' })
  @ApiBody({
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
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New access and refresh tokens issued',
    schema: {
      example: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
    schema: {
      example: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      },
    },
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user profile with saved addresses',
    schema: {
      example: {
        id: '0195e4a0-0000-7000-8000-000000000001',
        name: 'Ada Obi',
        phone: '08031234567',
        email: 'ada@sharwama.ng',
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
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Missing or invalid Bearer token',
    schema: {
      example: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    },
  })
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
