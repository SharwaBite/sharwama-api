import { Role } from '../../generated/prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  phone: string | null;
  role: Role;
  type: 'access' | 'refresh';
}
