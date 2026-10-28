import { TestBed } from '@angular/core/testing';
import { OrganizationService } from './organization.service';

const MOCK_ORGS = [
  { id: 1, parentOrganizationId: null, name: 'ACNSB', slug: 'acnsb', joinCode: 'ACNSB2026', description: 'Grupo 1', city: 'Campinas', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
  { id: 2, parentOrganizationId: null, name: 'Beija-Flor', slug: 'beija-flor', joinCode: 'BF2026', description: 'Grupo 2', city: 'São Paulo', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
  { id: 3, parentOrganizationId: null, name: 'Lagoa da Saudade', slug: 'lagoa-da-saudade', joinCode: 'LAGOA2026', description: 'Grupo 3', city: 'Santos', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
  { id: 4, parentOrganizationId: 1, name: 'ACNSB - Unidade Santos', slug: 'acnsb-santos', joinCode: 'ACNSB-SANTOS', description: 'Unidade', city: 'Santos', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
];

describe('OrganizationService (unit - mock localStorage)', () => {
  let service: OrganizationService;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [OrganizationService]
    });

    service = TestBed.inject(OrganizationService);
    // Keep tests deterministic regardless of seed evolution.
    (service as any)._cache = [...MOCK_ORGS];
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  // ── Observable queries ────────────────────────────────────────────────────

  it('getOrganizations deve retornar lista', (done) => {
    service.getOrganizations().subscribe(orgs => {
      expect(orgs.length).toBeGreaterThan(0);
      done();
    });
  });

  it('getById deve retornar org existente', (done) => {
    service.getById(1).subscribe(org => {
      expect(org).toBeTruthy();
      expect(org!.id).toBe(1);
      done();
    });
  });

  it('getById deve retornar undefined para id inexistente', (done) => {
    service.getById(9999).subscribe(org => {
      expect(org).toBeUndefined();
      done();
    });
  });

  // ── Sync helpers (cache-based) ─────────────────────────────────────────────

  it('getByJoinCode deve encontrar pelo código (case-insensitive)', () => {
    const org = service.getByJoinCode('acnsb2026');
    expect(org).toBeTruthy();
    expect(org!.id).toBe(1);
  });

  it('getByJoinCode deve retornar undefined para código inválido', () => {
    expect(service.getByJoinCode('INVALIDO')).toBeUndefined();
  });

  it('getByIdSync deve retornar org do cache', () => {
    const org = service.getByIdSync(2);
    expect(org?.name).toBe('Beija-Flor');
  });

  it('getOrganizationFamilySync deve retornar família correta para root org', () => {
    const family = service.getOrganizationFamilySync(1);
    expect(family).toContain(1);
    expect(family).toContain(4); // unit of 1
  });

  it('getOrganizationFamilySync deve retornar família a partir de unidade', () => {
    const family = service.getOrganizationFamilySync(4); // unit → finds root 1
    expect(family).toContain(1);
    expect(family).toContain(4);
  });

  // ── Create organization ────────────────────────────────────────────────────

  it('createOrganization deve criar com código único', () => {
    const result = service.createOrganization({ name: 'Grupo Teste', city: 'Campinas', state: 'SP' });
    expect(result.success).toBeTrue();
    expect(result.organization).toBeTruthy();
    expect(result.organization!.joinCode).toBeTruthy();
    expect(result.organization!.logoUrl).toBeTruthy();
    expect(result.organization!.parentOrganizationId).toBeNull();
  });

  it('createOrganization deve falhar sem nome/cidade/estado', () => {
    const result = service.createOrganization({ name: '', city: '', state: '' });
    expect(result.success).toBeFalse();
  });

  // ── Create unit ────────────────────────────────────────────────────────────

  it('createUnit deve criar unidade com parentOrganizationId correto', () => {
    const result = service.createUnit(1, { name: 'Nova Unidade', city: 'Piracicaba', state: 'SP' });
    expect(result.success).toBeTrue();
    expect(result.organization!.logoUrl).toBeTruthy();
    expect(result.organization!.parentOrganizationId).toBe(1);
  });

  it('createUnit deve falhar quando pai não existe', () => {
    const result = service.createUnit(9999, { name: 'X', city: 'Y', state: 'SP' });
    expect(result.success).toBeFalse();
  });

  it('createUnit não deve criar unidade de unidade', () => {
    const result = service.createUnit(4, { name: 'Sub', city: 'Sub', state: 'SP' }); // 4 is already a unit
    expect(result.success).toBeFalse();
  });
});
