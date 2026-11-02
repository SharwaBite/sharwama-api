import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((_key: string, defaultVal: string) => defaultVal),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a new customer account and issues tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Ada Obi',
      phone: '08030000000',
      email: 'ada@example.com',
      role: Role.CUSTOMER,
      createdAt: new Date(),
    });

    const result = await service.register({
      name: 'Ada Obi',
      phone: '08030000000',
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(result.user.phone).toBe('08030000000');
    expect(result.accessToken).toBe('mock-jwt-token');
    expect(result.refreshToken).toBe('mock-jwt-token');
  });

  it('rejects duplicate phone on registration', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

    await expect(
      service.register({
        name: 'Ada Obi',
        phone: '08030000000',
        password: 'password123',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('logs in a user with valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Ada Obi',
      phone: '08030000000',
      email: 'ada@example.com',
      passwordHash,
      role: Role.CUSTOMER,
      createdAt: new Date(),
    });

    const result = await service.login({
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(result.user.id).toBe('user-1');
    expect(result.accessToken).toBe('mock-jwt-token');
  });

  it('rejects invalid password on login', async () => {
    const passwordHash = await bcrypt.hash('password123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Ada Obi',
      phone: '08030000000',
      email: 'ada@example.com',
      passwordHash,
      role: Role.CUSTOMER,
      createdAt: new Date(),
    });

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});

