import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole } from '../models/user.model';
import { OrganizationService } from './organization.service';

const SESSION_KEY = 'capoeira_session';
const USERS_KEY   = 'capoeira_users';

type StoredUser = User & { password: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _currentUser = signal<User | null>(this._loadSession());
  private _users       = signal<StoredUser[]>(this._loadUsers());

  readonly currentUser  = this._currentUser.asReadonly();
  readonly users        = computed<User[]>(() =>
    this._users().map(({ password: _pw, ...user }) => user)
  );
  readonly isLoggedIn   = computed(() => this._currentUser() !== null);
  readonly isSuperAdmin = computed(() => this._currentUser()?.role === 'SUPER_ADMIN');
  readonly isPlatformSuperAdmin = computed(() => {
    const u = this._currentUser();
    return u?.role === 'SUPER_ADMIN' && !u.organizationId;
  });
  readonly isOrgSuperAdmin = computed(() => {
    const u = this._currentUser();
    return u?.role === 'SUPER_ADMIN' && !!u.organizationId;
  });

  readonly isAdmin = computed(() => {
    const r = this._currentUser()?.role;
    return r === 'ADMIN' || r === 'SUPER_ADMIN';
  });
  readonly isMember = computed(() => {
    const r = this._currentUser()?.role;
    return r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'MEMBER';
  });

  constructor(
    private router: Router,
    private organizationService: OrganizationService
  ) {}

  login(email: string, password: string): { success: boolean; message: string } {
    const found = this._users().find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    if (!found) return { success: false, message: 'E-mail ou senha incorretos.' };
    if (!found.active) return { success: false, message: 'Conta desativada. Entre em contato com o administrador.' };

    const { password: _pw, ...user } = found;
    this._currentUser.set(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, message: 'Login realizado com sucesso!' };
  }

  register(
    name: string,
    email: string,
    password: string,
    joinCode: string,
    createOrgPayload?: { name: string; city: string; state: string; description?: string }
  ): { success: boolean; message: string } {
    const exists = this._users().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) return { success: false, message: 'E-mail já cadastrado.' };

    if (createOrgPayload) {
      const orgResult = this.organizationService.createOrganization(createOrgPayload);
      if (!orgResult.success || !orgResult.organization) {
        return { success: false, message: orgResult.message };
      }
      const newUser: StoredUser = {
        id: this._nextUserId(), name, email, password,
        role: 'SUPER_ADMIN', active: true,
        organizationId: orgResult.organization.id,
        organizationUnitId: null,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=1a237e&fontColor=ffffff`
      };
      this._users.update(u => [...u, newUser]);
      this._saveUsers();
      const { password: _pw, ...user } = newUser;
      this._currentUser.set(user);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return {
        success: true,
        message: `Organização "${orgResult.organization.name}" criada! Você é agora o Super Admin. Código: ${orgResult.organization.joinCode}`
      };
    }

    const org = joinCode ? this.organizationService.getByJoinCode(joinCode) : undefined;
    const newUser: StoredUser = {
      id: this._nextUserId(), name, email, password,
      role: org ? 'MEMBER' : 'USER', active: true,
      organizationId: org ? org.id : null,
      organizationUnitId: null,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=3949ab&fontColor=ffffff`
    };
    this._users.update(u => [...u, newUser]);
    this._saveUsers();
    const { password: _pw, ...user } = newUser;
    this._currentUser.set(user);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return { success: true, message: org ? `Bem-vindo ao grupo ${org.name}!` : 'Cadastro realizado com sucesso!' };
  }

  logout(): void {
    this._currentUser.set(null);
    sessionStorage.removeItem(SESSION_KEY);
    this.router.navigate(['/']);
  }

  joinOrganization(joinCode: string): { success: boolean; message: string } {
    const current = this._currentUser();
    if (!current) return { success: false, message: 'Faça login para aderir a um grupo.' };
    if (current.organizationId) return { success: false, message: 'Você já está vinculado a um grupo.' };
    const org = this.organizationService.getByJoinCode(joinCode);
    if (!org) return { success: false, message: 'Código de grupo inválido.' };
    return this.assignCurrentUserToOrganization(org.id, 'MEMBER');
  }

  assignCurrentUserToOrganization(
    organizationId: number,
    role: UserRole = 'MEMBER'
  ): { success: boolean; message: string } {
    const current = this._currentUser();
    if (!current) return { success: false, message: 'Usuário não autenticado.' };
    this._users.update(users =>
      users.map(u => u.id !== current.id ? u : { ...u, organizationId, role })
    );
    this._saveUsers();
    const updated = this._users().find(u => u.id === current.id);
    if (!updated) return { success: false, message: 'Falha ao atualizar usuário.' };
    const { password: _pw, ...safeUser } = updated;
    this._currentUser.set(safeUser);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return { success: true, message: 'Grupo vinculado com sucesso.' };
  }

  createUserByAdmin(payload: {
    name: string; email: string; password: string;
    role: UserRole; organizationId: number | null;
  }): { success: boolean; message: string } {
    const actor = this._currentUser();
    if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN')) {
      return { success: false, message: 'Apenas admins podem criar usuários.' };
    }
    if (actor.role !== 'SUPER_ADMIN' && (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN')) {
      return { success: false, message: 'Apenas o super admin pode criar admins.' };
    }
    if (actor.role === 'SUPER_ADMIN' && !!actor.organizationId && payload.role === 'SUPER_ADMIN') {
      return { success: false, message: 'Apenas o admin de controle pode criar outros super admins.' };
    }
    const exists = this._users().find(u => u.email.toLowerCase() === payload.email.toLowerCase());
    if (exists) return { success: false, message: 'E-mail já cadastrado.' };

    let organizationId: number | null;
    if (!actor.organizationId) {
      organizationId = payload.organizationId;
    } else if (actor.role === 'SUPER_ADMIN') {
      const family = this.organizationService.getOrganizationFamilySync(actor.organizationId);
      organizationId = payload.organizationId && family.includes(payload.organizationId)
        ? payload.organizationId : actor.organizationId;
    } else {
      organizationId = actor.organizationId;
    }

    const newUser: StoredUser = {
      id: this._nextUserId(),
      name: payload.name.trim(), email: payload.email.trim().toLowerCase(),
      password: payload.password, role: payload.role, active: true,
      organizationId, organizationUnitId: null,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.name)}&backgroundColor=1a237e&fontColor=ffffff`
    };
    this._users.update(u => [...u, newUser]);
    this._saveUsers();
    return { success: true, message: 'Usuário criado com sucesso.' };
  }

  updateUserBySuperAdmin(
    userId: number,
    payload: { name: string; email: string; role: UserRole; organizationId: number | null; active: boolean }
  ): { success: boolean; message: string } {
    const actor = this._currentUser();
    if (!actor || actor.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Apenas super admin pode editar usuários e permissões.' };
    }
    const existing = this._users().find(u => u.id === userId);
    if (!existing) return { success: false, message: 'Usuário não encontrado.' };

    if (actor.organizationId) {
      const family = this.organizationService.getOrganizationFamilySync(actor.organizationId);
      if (existing.organizationId && !family.includes(existing.organizationId)) {
        return { success: false, message: 'Você não tem permissão para editar este usuário.' };
      }
    }
    const normalizedEmail = payload.email.trim().toLowerCase();
    const dup = this._users().find(u => u.id !== userId && u.email.toLowerCase() === normalizedEmail);
    if (dup) return { success: false, message: 'E-mail já cadastrado para outro usuário.' };
    if (existing.id === actor.id && payload.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Super admin não pode remover sua própria permissão de controle.' };
    }

    this._users.update(users =>
      users.map(u => u.id !== userId ? u : {
        ...u,
        name: payload.name.trim(), email: normalizedEmail,
        role: payload.role,
        organizationId: payload.role === 'USER' ? null : payload.organizationId,
        active: payload.active
      })
    );
    this._saveUsers();

    const updatedCurrent = this._users().find(u => u.id === actor.id);
    if (updatedCurrent) {
      const { password: _pw, ...safe } = updatedCurrent;
      this._currentUser.set(safe);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
    }
    return { success: true, message: 'Usuário atualizado com sucesso.' };
  }

  getUserOrganizationId(): number | null {
    const current = this._currentUser();
    if (!current) return null;
    const persisted = this._users().find(u => u.id === current.id);
    if (!persisted) return current.organizationId ?? null;
    if (persisted.organizationId !== current.organizationId) {
      const { password: _pw, ...safe } = persisted;
      this._currentUser.set(safe);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe));
      return persisted.organizationId;
    }
    return current.organizationId ?? null;
  }

  getUsersSnapshot(): User[] { return this.users(); }

  getVisibleUsersForAdmin(): User[] {
    const actor = this._currentUser();
    if (!actor) return [];
    const all = this.users();
    if (actor.role === 'SUPER_ADMIN' && !actor.organizationId) return all;
    if (actor.role === 'SUPER_ADMIN' && actor.organizationId) {
      const family = this.organizationService.getOrganizationFamilySync(actor.organizationId);
      return all.filter(u => u.organizationId !== null && family.includes(u.organizationId));
    }
    return all.filter(u =>
      u.organizationId === actor.organizationId &&
      u.role !== 'ADMIN' && u.role !== 'SUPER_ADMIN'
    );
  }

  loadVisibleUsersForAdmin(): Promise<User[]> {
    return Promise.resolve(this.getVisibleUsersForAdmin());
  }

  private _nextUserId(): number {
    const ids = this._users().map(u => u.id as number);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  private _loadUsers(): StoredUser[] {
    let persisted: StoredUser[] = [];
    try {
      const raw = localStorage.getItem(USERS_KEY);
      if (raw) persisted = JSON.parse(raw) as StoredUser[];
    } catch {
      persisted = [];
    }
    const normalized = persisted.sort((a, b) => (a.id as number) - (b.id as number));
    localStorage.setItem(USERS_KEY, JSON.stringify(normalized));
    return normalized;
  }

  private _saveUsers(): void {
    localStorage.setItem(USERS_KEY, JSON.stringify(this._users()));
  }

  private _loadSession(): User | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
}
