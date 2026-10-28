import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { OrganizationService } from './organization.service';

describe('AuthService (unit - mock)', () => {
  let service: AuthService;

  const SESSION_KEY = 'capoeira_session';
  const USERS_KEY   = 'capoeira_users';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        OrganizationService,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } }
      ]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ── Seed & initialization ───────────────────────────────────────────────────

  it('deve inicializar com usuários seed', () => {
    expect(service.users().length).toBeGreaterThan(0);
  });

  it('deve conter super admin na seed', () => {
    const sa = service.users().find(u => u.role === 'SUPER_ADMIN' && !u.organizationId);
    expect(sa).toBeTruthy();
    expect(sa!.email).toBe('superadmin@capoeira.com');
  });

  it('bonfim deve ser SUPER_ADMIN com org após upgrade de seed', () => {
    const bonfim = service.users().find(u => u.email === 'bonfim@capoeira.com');
    expect(bonfim?.role).toBe('SUPER_ADMIN');
    expect(bonfim?.organizationId).toBe(1);
  });

  // ── Login ───────────────────────────────────────────────────────────────────

  it('login com credenciais corretas', () => {
    const r = service.login('bonfim@capoeira.com', 'admin123');
    expect(r.success).toBeTrue();
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.currentUser()?.email).toBe('bonfim@capoeira.com');
  });

  it('login com senha errada deve falhar', () => {
    const r = service.login('bonfim@capoeira.com', 'errada');
    expect(r.success).toBeFalse();
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('login com email inexistente deve falhar', () => {
    expect(service.login('nao@existe.com', '123').success).toBeFalse();
  });

  it('login com conta inativa deve falhar', () => {
    service.login('superadmin@capoeira.com', 'super123');
    service.createUserByAdmin({ name: 'Inativo', email: 'in@in.com', password: '123', role: 'USER', organizationId: null });
    const user = service.users().find(u => u.email === 'in@in.com')!;
    service.updateUserBySuperAdmin(user.id, { name: 'Inativo', email: 'in@in.com', role: 'USER', organizationId: null, active: false });
    service.logout();
    const r = service.login('in@in.com', '123');
    expect(r.success).toBeFalse();
    expect(r.message).toContain('desativada');
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  it('logout deve limpar sessão', () => {
    service.login('renan@capoeira.com', 'user123');
    expect(service.isLoggedIn()).toBeTrue();
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  // ── Roles ───────────────────────────────────────────────────────────────────

  it('isSuperAdmin true para SUPER_ADMIN', () => {
    service.login('superadmin@capoeira.com', 'super123');
    expect(service.isSuperAdmin()).toBeTrue();
  });

  it('isPlatformSuperAdmin → true apenas para SUPER_ADMIN sem org', () => {
    service.login('superadmin@capoeira.com', 'super123');
    expect(service.isPlatformSuperAdmin()).toBeTrue();
    expect(service.isOrgSuperAdmin()).toBeFalse();
  });

  it('isOrgSuperAdmin → true para SUPER_ADMIN com org', () => {
    service.login('bonfim@capoeira.com', 'admin123');
    expect(service.isOrgSuperAdmin()).toBeTrue();
    expect(service.isPlatformSuperAdmin()).toBeFalse();
  });

  it('isAdmin true para ADMIN e SUPER_ADMIN', () => {
    service.login('bonfim@capoeira.com', 'admin123');
    expect(service.isAdmin()).toBeTrue();
  });

  it('isAdmin false para MEMBER', () => {
    service.login('renan@capoeira.com', 'user123');
    expect(service.isAdmin()).toBeFalse();
  });

  // ── Organization ────────────────────────────────────────────────────────────

  it('getUserOrganizationId null quando não logado', () => {
    expect(service.getUserOrganizationId()).toBeNull();
  });

  it('getUserOrganizationId correto após login', () => {
    service.login('bonfim@capoeira.com', 'admin123');
    expect(service.getUserOrganizationId()).toBe(1);
  });

  it('joinOrganization com código válido', () => {
    service.login('superadmin@capoeira.com', 'super123');
    service.register('Novo', 'novo@test.com', 'senha123', '');
    service.logout();
    service.login('novo@test.com', 'senha123');
    const r = service.joinOrganization('ACNSB2026');
    expect(r.success).toBeTrue();
    expect(service.currentUser()?.organizationId).toBe(1);
  });

  it('joinOrganization com código inválido deve falhar', () => {
    service.login('superadmin@capoeira.com', 'super123');
    service.register('X', 'x@test.com', 'senha123', '');
    service.logout();
    service.login('x@test.com', 'senha123');
    const r = service.joinOrganization('INVALIDO');
    expect(r.success).toBeFalse();
  });

  // ── Register ────────────────────────────────────────────────────────────────

  it('register com código válido → MEMBER', () => {
    const r = service.register('Aluno', 'aluno@test.com', 'senha123', 'ACNSB2026');
    expect(r.success).toBeTrue();
    expect(service.currentUser()?.role).toBe('MEMBER');
    expect(service.currentUser()?.organizationId).toBe(1);
  });

  it('register sem código → USER', () => {
    const r = service.register('Visitante', 'v@test.com', 'senha123', '');
    expect(r.success).toBeTrue();
    expect(service.currentUser()?.role).toBe('USER');
    expect(service.currentUser()?.organizationId).toBeNull();
  });

  it('register com email duplicado deve falhar', () => {
    expect(service.register('Renan', 'renan@capoeira.com', 'outra', '').success).toBeFalse();
  });

  it('register criando org → SUPER_ADMIN com org', () => {
    const r = service.register('Criador', 'criador@test.com', 'senha123', '', {
      name: 'Novo Grupo', city: 'SP', state: 'SP'
    });
    expect(r.success).toBeTrue();
    expect(service.currentUser()?.role).toBe('SUPER_ADMIN');
    expect(service.currentUser()?.organizationId).toBeTruthy();
  });

  // ── createUserByAdmin ────────────────────────────────────────────────────────

  it('SUPER_ADMIN cria usuário com sucesso', () => {
    service.login('superadmin@capoeira.com', 'super123');
    const before = service.users().length;
    const r = service.createUserByAdmin({ name: 'Novo', email: 'novo@t.com', password: '123', role: 'MEMBER', organizationId: 1 });
    expect(r.success).toBeTrue();
    expect(service.users().length).toBe(before + 1);
  });

  it('não-super-admin não cria ADMIN', () => {
    service.login('santos@capoeira.com', 'admin123');
    const r = service.createUserByAdmin({ name: 'A', email: 'a@t.com', password: '123', role: 'ADMIN', organizationId: 1 });
    expect(r.success).toBeFalse();
  });

  it('email duplicado deve falhar', () => {
    service.login('superadmin@capoeira.com', 'super123');
    const r = service.createUserByAdmin({ name: 'Dup', email: 'bonfim@capoeira.com', password: '123', role: 'USER', organizationId: null });
    expect(r.success).toBeFalse();
    expect(r.message).toContain('já cadastrado');
  });

  // ── updateUserBySuperAdmin ────────────────────────────────────────────────────

  it('SUPER_ADMIN atualiza usuário', () => {
    service.login('superadmin@capoeira.com', 'super123');
    const user = service.users().find(u => u.email === 'renan@capoeira.com')!;
    const r = service.updateUserBySuperAdmin(user.id, { name: 'Renan Up', email: 'renan@capoeira.com', role: 'MEMBER', organizationId: 4, active: true });
    expect(r.success).toBeTrue();
    expect(service.users().find(u => u.id === user.id)?.name).toBe('Renan Up');
  });

  it('não-super-admin não atualiza usuário', () => {
    service.login('santos@capoeira.com', 'admin123');
    const user = service.users().find(u => u.email === 'renan@capoeira.com')!;
    const r = service.updateUserBySuperAdmin(user.id, { name: 'X', email: 'renan@capoeira.com', role: 'USER', organizationId: null, active: true });
    expect(r.success).toBeFalse();
  });

  // ── getVisibleUsersForAdmin ───────────────────────────────────────────────────

  it('platform SUPER_ADMIN vê todos os usuários', () => {
    service.login('superadmin@capoeira.com', 'super123');
    expect(service.getVisibleUsersForAdmin().length).toBe(service.users().length);
  });

  it('org SUPER_ADMIN vê apenas usuários da família', () => {
    service.login('bonfim@capoeira.com', 'admin123'); // org=1, family=[1,4,5]
    const visible = service.getVisibleUsersForAdmin();
    expect(visible.every(u => u.organizationId !== null)).toBeTrue();
  });

  // ── Persistência ─────────────────────────────────────────────────────────────

  it('usuário criado persiste no localStorage', () => {
    service.login('superadmin@capoeira.com', 'super123');
    service.createUserByAdmin({ name: 'Persiste', email: 'p@t.com', password: 'abc', role: 'USER', organizationId: null });
    const stored = JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as any[];
    expect(stored.some((u: any) => u.email === 'p@t.com')).toBeTrue();
  });
});
