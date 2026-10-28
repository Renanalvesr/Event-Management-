export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER' | 'USER';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  organizationId: number | null;
  organizationUnitId: number | null;
  avatarUrl: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatarUrl: string;
  joinCode: string;
}
