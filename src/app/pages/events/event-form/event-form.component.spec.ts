import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { EventFormComponent } from './event-form.component';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { OrganizationService } from '../../../services/organization.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { User } from '../../../models/user.model';
import { Organization } from '../../../models/organization.model';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_ORGS: Organization[] = [
  { id: 1, parentOrganizationId: null, name: 'ACNSB', slug: 'acnsb', joinCode: 'ACNSB2026', description: '', city: 'Campinas', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
  { id: 2, parentOrganizationId: null, name: 'Beija-Flor', slug: 'beija-flor', joinCode: 'BF2026', description: '', city: 'SP', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
  { id: 3, parentOrganizationId: null, name: 'Lagoa da Saudade', slug: 'lagoa-da-saudade', joinCode: 'LAGOA2026', description: '', city: 'Santos', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
  { id: 4, parentOrganizationId: 1, name: 'ACNSB - Unidade Santos', slug: 'acnsb-santos', joinCode: 'ACNSB-SANTOS', description: '', city: 'Santos', state: 'SP', country: 'Brasil', address: '', contactPhone: '', contactEmail: '', active: true },
];

const unitAdmin: User = { id: 7, name: 'Admin Santos', email: 'santos@capoeira.com', role: 'ADMIN', active: true, organizationId: 4, organizationUnitId: null, avatarUrl: '' };
const orgSuperAdmin: User  = { id: 2, name: 'Bonfim', email: 'bonfim@capoeira.com', role: 'SUPER_ADMIN', active: true, organizationId: 1, organizationUnitId: null, avatarUrl: '' };
const platformAdmin: User = { id: 1, name: 'SA', email: 'superadmin@capoeira.com', role: 'SUPER_ADMIN', active: true, organizationId: null, organizationUnitId: null, avatarUrl: '' };

describe('EventFormComponent (integração)', () => {
  let component: EventFormComponent;
  let fixture: ComponentFixture<EventFormComponent>;
  let mockEventService: jasmine.SpyObj<EventService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockOrgService: jasmine.SpyObj<OrganizationService>;
  let mockRouter: jasmine.SpyObj<Router>;

  function setupAuth(user: User) {
    (mockAuthService as any).currentUser = signal(user);
    mockAuthService.isSuperAdmin.and.returnValue(user.role === 'SUPER_ADMIN');
    mockAuthService.isPlatformSuperAdmin.and.returnValue(user.role === 'SUPER_ADMIN' && !user.organizationId);
    mockAuthService.isOrgSuperAdmin.and.returnValue(user.role === 'SUPER_ADMIN' && !!user.organizationId);
    mockAuthService.getUserOrganizationId.and.returnValue(user.organizationId);
  }

  beforeEach(async () => {
    mockEventService = jasmine.createSpyObj('EventService', ['createEvent', 'updateEvent', 'getEventById', 'uploadEventImage']);
    mockAuthService  = jasmine.createSpyObj('AuthService', ['isSuperAdmin', 'isPlatformSuperAdmin', 'isOrgSuperAdmin', 'getUserOrganizationId']);
    mockOrgService   = jasmine.createSpyObj('OrganizationService', ['getOrganizations', 'getOrganizationFamilySync', 'getByIdSync']);
    mockRouter       = jasmine.createSpyObj('Router', ['navigate']);

    mockOrgService.getOrganizations.and.returnValue(of(MOCK_ORGS));
    mockOrgService.getOrganizationFamilySync.and.callFake((id: number) => {
      if (id === 1 || id === 4) return [1, 4];
      return [id];
    });
    mockOrgService.getByIdSync.and.callFake((id: number) => MOCK_ORGS.find(o => o.id === id));
    mockEventService.uploadEventImage.and.returnValue(of('https://example.com/event-image.jpg'));

    setupAuth(unitAdmin); // default: unit ADMIN (org=4)

    await TestBed.configureTestingModule({
      imports: [EventFormComponent, RouterTestingModule],
      providers: [
        { provide: EventService,      useValue: mockEventService },
        { provide: AuthService,       useValue: mockAuthService },
        { provide: OrganizationService, useValue: mockOrgService },
        { provide: Router,            useValue: mockRouter },
        { provide: ActivatedRoute,    useValue: { snapshot: { queryParamMap: { get: () => null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Bootstrap ────────────────────────────────────────────────────────────────

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar organizações ao iniciar', () => {
    expect(mockOrgService.getOrganizations).toHaveBeenCalled();
    expect(component.organizations.length).toBe(MOCK_ORGS.length);
  });

  // ── Scope selector ────────────────────────────────────────────────────────────

  it('eventScope inicial deve ser PUBLIC', () => {
    expect(component.eventScope).toBe('PUBLIC');
    expect(component.form.visibility).toBe('PUBLIC');
  });

  it('canUseScope PUBLIC deve ser sempre true', () => {
    expect(component.canUseScope('PUBLIC')).toBeTrue();
  });

  it('unit ADMIN não pode usar escopo ORG', () => {
    expect(component.canUseScope('ORG')).toBeFalse();
  });

  it('unit ADMIN pode usar escopo UNIT', () => {
    expect(component.canUseScope('UNIT')).toBeTrue();
  });

  it('org SUPER_ADMIN pode usar todos os escopos', () => {
    setupAuth(orgSuperAdmin);
    expect(component.canUseScope('PUBLIC')).toBeTrue();
    expect(component.canUseScope('ORG')).toBeTrue();
    expect(component.canUseScope('UNIT')).toBeTrue();
  });

  it('onScopeChange PUBLIC deve limpar organizationId', () => {
    component.form.organizationId = 4;
    component.eventScope = 'PUBLIC';
    component.onScopeChange();
    expect(component.form.visibility).toBe('PUBLIC');
    expect(component.form.organizationId).toBeNull();
  });

  it('onScopeChange ORG para orgSuperAdmin deve setar rootOrg.id', () => {
    setupAuth(orgSuperAdmin);
    component.rootOrg = MOCK_ORGS[0]; // org 1
    component.eventScope = 'ORG';
    component.onScopeChange();
    expect(component.form.visibility).toBe('PRIVATE');
    expect(component.form.organizationId).toBe(1);
  });

  it('onScopeChange UNIT para unit ADMIN deve setar sua própria unidade', () => {
    component.eventScope = 'UNIT';
    component.onScopeChange();
    expect(component.form.visibility).toBe('PRIVATE');
    expect(component.form.organizationId).toBe(4);
  });

  // ── availableUnits ────────────────────────────────────────────────────────────

  it('availableUnits vazio para unit ADMIN (sem escolha)', () => {
    expect(component.availableUnits.length).toBe(0);
  });

  it('availableUnits retorna unidades da org para orgSuperAdmin', () => {
    setupAuth(orgSuperAdmin);
    component.rootOrg = MOCK_ORGS[0];
    component.orgUnits = MOCK_ORGS.filter(o => o.parentOrganizationId === 1);
    expect(component.availableUnits.length).toBeGreaterThan(0);
  });

  // ── Submit validation ─────────────────────────────────────────────────────────

  it('submit deve mostrar erro se campos obrigatórios estiverem vazios', () => {
    component.form.title = '';
    component.submit();
    expect(component.error()).toContain('obrigatórios');
  });

  it('submit deve mostrar erro se data fim for antes da data início', () => {
    component.form.title = 'T';
    component.form.startDate = '2026-08-01T10:00';
    component.form.endDate = '2026-07-01T10:00';
    component.form.location = 'L';
    component.form.contactPhone = '+55';
    component.submit();
    expect(component.error()).toContain('data de fim');
  });

  it('submit deve mostrar erro de valor para evento pago sem preço', () => {
    component.form.title = 'Pago';
    component.form.startDate = '2026-08-01T10:00';
    component.form.endDate = '2026-08-01T18:00';
    component.form.location = 'L';
    component.form.contactPhone = '+55';
    component.form.isPaid = true;
    component.form.ticketPrice = null;
    component.submit();
    expect(component.error()).toContain('valor do evento pago');
  });

  it('submit PUBLIC com dados válidos chama createEvent', fakeAsync(() => {
    mockEventService.createEvent.and.returnValue(of({ id: 99 } as any));
    component.form.title = 'Evento Público';
    component.form.startDate = '2026-08-01T10:00';
    component.form.endDate = '2026-08-01T18:00';
    component.form.location = 'Local';
    component.form.contactPhone = '+5511999999999';
    component.eventScope = 'PUBLIC';
    component.submit();
    tick(400);
    expect(mockEventService.createEvent).toHaveBeenCalled();
    const args = mockEventService.createEvent.calls.mostRecent().args[0];
    expect(args.visibility).toBe('PUBLIC');
    expect(args.organizationId).toBeNull();
  }));

  it('submit UNIT sem org selecionada mostra erro', () => {
    component.form.title = 'T';
    component.form.startDate = '2026-08-01T10:00';
    component.form.endDate = '2026-08-01T18:00';
    component.form.location = 'L';
    component.form.contactPhone = '+55';
    component.eventScope = 'UNIT';
    component.form.organizationId = null;
    component.submit();
    expect(component.error()).toContain('unidade');
  });

  // ── Sale items ────────────────────────────────────────────────────────────────

  it('addSaleItem deve adicionar item à lista', () => {
    component.saleItemName = 'CD de Ladainhas';
    component.saleItemPrice = 30;
    component.addSaleItem();
    expect(component.form.saleItems!.length).toBe(1);
    expect(component.form.saleItems![0].name).toBe('CD de Ladainhas');
  });

  it('addSaleItem deve mostrar erro se nome for vazio', () => {
    component.saleItemName = '';
    component.saleItemPrice = 50;
    component.addSaleItem();
    expect(component.error()).toContain('nome do item');
  });

  it('addSaleItem deve mostrar erro para item duplicado', () => {
    component.saleItemName = 'CD'; component.saleItemPrice = 25; component.addSaleItem();
    component.saleItemName = 'CD'; component.saleItemPrice = 20; component.addSaleItem();
    expect(component.error()).toContain('já foi adicionado');
  });

  it('removeSaleItem deve remover item por nome', () => {
    component.form.saleItems = [{ name: 'CD', price: 25, interestedUserIds: [] }];
    component.removeSaleItem('CD');
    expect(component.form.saleItems!.length).toBe(0);
  });

  it('onPaidChange deve limpar ticketPrice quando não pago', () => {
    component.form.isPaid = false;
    component.form.ticketPrice = 99;
    component.onPaidChange();
    expect(component.form.ticketPrice).toBeNull();
  });

  it('onImageSelected deve enviar arquivo e preencher imageUrl', () => {
    const file = new File(['img'], 'evento.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as unknown as Event;

    component.onImageSelected(event);

    expect(mockEventService.uploadEventImage).toHaveBeenCalledWith(file);
    expect(component.form.imageUrl).toBe('https://example.com/event-image.jpg');
  });
});
