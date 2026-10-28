import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EventService } from './event.service';
import { AuthService } from './auth.service';
import { OrganizationService } from './organization.service';
import { User } from '../models/user.model';

const ORGS = [
  { id: 1, parentOrganizationId: null },
  { id: 4, parentOrganizationId: 1 },
  { id: 5, parentOrganizationId: 1 }
];

function buildAuthMock(user: Partial<User> | null): jasmine.SpyObj<AuthService> {
  const auth = jasmine.createSpyObj<AuthService>('AuthService', [
    'getUserOrganizationId',
    'isPlatformSuperAdmin',
    'isOrgSuperAdmin'
  ]);
  (auth as any).currentUser = signal(user as User | null);
  auth.getUserOrganizationId.and.returnValue(user?.organizationId ?? null);
  auth.isPlatformSuperAdmin.and.returnValue(user?.role === 'SUPER_ADMIN' && !user?.organizationId);
  auth.isOrgSuperAdmin.and.returnValue(user?.role === 'SUPER_ADMIN' && !!user?.organizationId);
  return auth;
}

describe('EventService (unit - mock in-memory)', () => {
  let service: EventService;

  function setup(user: Partial<User> | null): void {
    const auth = buildAuthMock(user);
    const org = jasmine.createSpyObj<OrganizationService>('OrganizationService', [
      'getOrganizationFamilySync',
      'getByIdSync'
    ]);

    org.getOrganizationFamilySync.and.callFake((id: number) => {
      if (id === 1 || id === 4 || id === 5) return [1, 4, 5];
      return [id];
    });
    org.getByIdSync.and.callFake((id: number) => ORGS.find(o => o.id === id) as any);

    TestBed.configureTestingModule({
      providers: [
        EventService,
        { provide: AuthService, useValue: auth },
        { provide: OrganizationService, useValue: org }
      ]
    });
    service = TestBed.inject(EventService);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it('usuário não autenticado vê apenas eventos públicos', (done) => {
    setup(null);
    service.getVisibleEvents().subscribe(events => {
      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.visibility === 'PUBLIC')).toBeTrue();
      done();
    });
  });

  it('platform SUPER_ADMIN vê eventos privados e públicos', (done) => {
    setup({ role: 'SUPER_ADMIN', organizationId: null });
    service.getVisibleEvents().subscribe(events => {
      expect(events.some(e => e.visibility === 'PRIVATE')).toBeTrue();
      done();
    });
  });

  it('org SUPER_ADMIN (org=1) vê eventos privados da família', (done) => {
    setup({ role: 'SUPER_ADMIN', organizationId: 1 });
    service.getVisibleEvents().subscribe(events => {
      expect(events.some(e => e.organizationId === 1 && e.visibility === 'PRIVATE')).toBeTrue();
      expect(events.some(e => e.organizationId === 4 && e.visibility === 'PRIVATE')).toBeTrue();
      done();
    });
  });

  it('membro da unidade 4 vê privado da unidade e da raiz da família', (done) => {
    setup({ role: 'MEMBER', organizationId: 4 });
    service.getVisibleEvents().subscribe(events => {
      expect(events.some(e => e.organizationId === 4 && e.visibility === 'PRIVATE')).toBeTrue();
      expect(events.some(e => e.organizationId === 1 && e.visibility === 'PRIVATE')).toBeTrue();
      done();
    });
  });

  it('eventos visíveis vêm ordenados por startDate crescente', (done) => {
    setup({ role: 'SUPER_ADMIN', organizationId: null });
    service.getVisibleEvents().subscribe(events => {
      for (let i = 1; i < events.length; i++) {
        expect(new Date(events[i].startDate).getTime())
          .toBeGreaterThanOrEqual(new Date(events[i - 1].startDate).getTime());
      }
      done();
    });
  });

  it('getEventById retorna evento existente', (done) => {
    setup(null);
    service.getEventById(1).subscribe(event => {
      expect(event?.id).toBe(1);
      done();
    });
  });

  it('getEventById retorna undefined para id inexistente', (done) => {
    setup(null);
    service.getEventById(9999).subscribe(event => {
      expect(event).toBeUndefined();
      done();
    });
  });

  it('createEvent cria evento ativo', (done) => {
    setup({ role: 'ADMIN', organizationId: 1 });
    service.createEvent({
      title: 'Evento Teste',
      description: 'Desc',
      startDate: '2026-07-01T10:00',
      endDate: '2026-07-01T18:00',
      location: 'Local',
      contactPhone: '+5511999999999',
      visibility: 'PUBLIC',
      organizationId: null
    }).subscribe(created => {
      expect(created.title).toBe('Evento Teste');
      expect(created.active).toBeTrue();
      done();
    });
  });

  it('isEventNew fica false após marcar como visto', (done) => {
    setup({ id: 7, role: 'MEMBER', organizationId: 1 });
    service.createEvent({
      title: 'Fresh',
      description: '',
      startDate: '2026-08-01T09:00',
      endDate: '2026-08-01T12:00',
      location: 'L',
      contactPhone: '+55',
      visibility: 'PUBLIC',
      organizationId: null
    }).subscribe(created => {
      expect(service.isEventNew(created)).toBeTrue();
      service.markEventAsSeen(created.id);
      expect(service.isEventNew(created)).toBeFalse();
      done();
    });
  });

  it('toggleSaleItemInterest registra e remove interesse', (done) => {
    setup({ role: 'MEMBER', organizationId: 1 });
    service.createEvent({
      title: 'Loja',
      description: '',
      startDate: '2026-09-01T09:00',
      endDate: '2026-09-01T12:00',
      location: 'L',
      contactPhone: '+55',
      visibility: 'PUBLIC',
      organizationId: null,
      saleItems: [{ name: 'CD', price: 30, interestedUserIds: [] }]
    }).subscribe(created => {
      service.toggleSaleItemInterest(created.id, 'CD', 42).subscribe(updated1 => {
        const item1 = updated1?.saleItems?.find(i => i.name === 'CD');
        expect(item1?.interestedUserIds).toContain(42);

        service.toggleSaleItemInterest(created.id, 'CD', 42).subscribe(updated2 => {
          const item2 = updated2?.saleItems?.find(i => i.name === 'CD');
          expect(item2?.interestedUserIds).not.toContain(42);
          done();
        });
      });
    });
  });
});
