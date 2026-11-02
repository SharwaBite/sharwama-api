import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly google = new OAuth2Client();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingPhone = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      select: { id: true },
    });

    if (existingPhone) {
      throw new ConflictException({
        code: 'PHONE_ALREADY_EXISTS',
        message: 'An account with this phone number already exists',
      });
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
        select: { id: true },
      });

      if (existingEmail) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists',
        });
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.issueTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash || !(await bcrypt.compare(dto.password, user?.passwordHash))) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',  
        message: 'Invalid email or password',
      });
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };

    const tokens = await this.issueTokens(authUser);

    return {
      user: {
        ...authUser,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async googleLogin(idToken: string) {
    const ticket = await this.google
      .verifyIdToken({
        idToken,
        audience: this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      })
      .catch(() => {
        throw new UnauthorizedException({
          code: 'INVALID_GOOGLE_TOKEN',
          message: 'Invalid Google token',
        });
      });

    const p = ticket.getPayload();
    if (!p?.sub || !p.email || !p.email_verified) {
      throw new UnauthorizedException({
        code: 'UNVERIFIED_GOOGLE_EMAIL',
        message: 'Google account email is not verified',
      });
    }

    let user = await this.prisma.user.findUnique({
      where: { googleId: p.sub },
    });

    if (!user) {
      const existing = await this.prisma.user.findUnique({
        where: { email: p.email },
      });

      if (existing?.role === 'ADMIN') {
        throw new ForbiddenException({
          code: 'ADMIN_GOOGLE_LOGIN_FORBIDDEN',
          message: 'Use the admin sign in',
        });
      }

      user = existing
        ? await this.prisma.user.update({
            where: { id: existing.id },
            data: {
              googleId: p.sub,
              emailVerified: true,
              avatarUrl: existing.avatarUrl ?? p.picture,
            },
          })
        : await this.prisma.user.create({
            data: {
              name: p.name ?? p.email.split('@')[0],
              email: p.email,
              googleId: p.sub,
              emailVerified: true,
              avatarUrl: p.picture,
              role: 'CUSTOMER',
            },
          });
    }

    if (user.role === 'ADMIN') {
      throw new ForbiddenException({
        code: 'ADMIN_GOOGLE_LOGIN_FORBIDDEN',
        message: 'Use the admin sign in',
      });
    }

    const authUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    };

    const tokens = await this.issueTokens(authUser);

    return {
      user: {
        ...authUser,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(
        dto.refreshToken,
        {
          secret: this.getRefreshSecret(),
        },
      );
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid refresh token type',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'User no longer exists',
      });
    }

    return this.issueTokens(user);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatarUrl: true,
        emailVerified: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: { isDefault: 'desc' },
          include: {
            zone: {
              select: {
                id: true,
                name: true,
                fee: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    return user;
  }

  private async issueTokens(user: AuthenticatedUser) {
    const accessPayload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.getAccessSecret(),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.getRefreshSecret(),
        expiresIn: '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private getAccessSecret(): string {
    return this.config.get<string>('JWT_SECRET', 'dev-jwt-secret-change-me');
  }

  private getRefreshSecret(): string {
    return this.config.get<string>(
      'JWT_REFRESH_SECRET',
      `${this.getAccessSecret()}-refresh`,
    );
  }
}
