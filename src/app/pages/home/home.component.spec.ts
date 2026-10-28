import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { HomeComponent } from './home.component';
import { AuthService } from '../../services/auth.service';
import { OrganizationService } from '../../services/organization.service';
import { Organization } from '../../models/organization.model';

describe('HomeComponent (hero customization)', () => {
  let fixture: ComponentFixture<HomeComponent>;
  let component: HomeComponent;

  let authMock: {
    isLoggedIn: jasmine.Spy;
    isAdmin: jasmine.Spy;
    getUserOrganizationId: jasmine.Spy;
    joinOrganization: jasmine.Spy;
    assignCurrentUserToOrganization: jasmine.Spy;
  };

  let organizationServiceMock: {
    getOrganizations: jasmine.Spy;
    createOrganization: jasmine.Spy;
    getByIdSync: jasmine.Spy;
  };

  const organization: Organization = {
    id: 1,
    parentOrganizationId: null,
    name: 'ACNSB',
    slug: 'acnsb',
    description: 'Grupo de teste',
    city: 'Campinas',
    state: 'SP',
    country: 'Brasil',
    address: 'Rua Teste',
    contactPhone: '+5511999999999',
    contactEmail: 'contato@teste.com',
    joinCode: 'ACNSB2026',
    logoUrl: 'https://example.com/org-logo.png',
    active: true
  };

  beforeEach(async () => {
    authMock = {
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
      isAdmin: jasmine.createSpy('isAdmin').and.returnValue(false),
      getUserOrganizationId: jasmine.createSpy('getUserOrganizationId').and.returnValue(null),
      joinOrganization: jasmine.createSpy('joinOrganization').and.returnValue({ success: true, message: 'ok' }),
      assignCurrentUserToOrganization: jasmine.createSpy('assignCurrentUserToOrganization').and.returnValue({ success: true, message: 'ok' })
    };

    organizationServiceMock = {
      getOrganizations: jasmine.createSpy('getOrganizations').and.returnValue(of([organization])),
      createOrganization: jasmine.createSpy('createOrganization').and.returnValue({ success: true, organization }),
      getByIdSync: jasmine.createSpy('getByIdSync').and.callFake((id: number) => (id === 1 ? organization : undefined))
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authMock },
        { provide: OrganizationService, useValue: organizationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it('deve manter a imagem padrao da hero quando nao estiver logado', () => {
    authMock.isLoggedIn.and.returnValue(false);
    authMock.getUserOrganizationId.and.returnValue(null);

    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero') as HTMLElement;
    const featuredImage = fixture.nativeElement.querySelector('.module-card__img img') as HTMLImageElement;
    expect(component.showOrganizationHero).toBeFalse();
    expect(component.heroBackgroundImage).toContain('assets/backgrounds/Capoeira_Bonfim.jpg');
    expect(hero.style.backgroundImage).toContain('assets/backgrounds/Capoeira_Bonfim.jpg');
    expect(hero.classList.contains('hero--organization')).toBeFalse();
    expect(component.featuredEventsImage).toBe('assets/backgrounds/eventos.png');
    expect(featuredImage.getAttribute('src')).toContain('assets/backgrounds/eventos.png');
  });

  it('deve usar o logo da organizacao na hero quando usuario estiver logado', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.getUserOrganizationId.and.returnValue(1);

    fixture.detectChanges();

    component.onOrganizationHeroImageLoad();
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero') as HTMLElement;
    const chip = fixture.nativeElement.querySelector('.hero__org-chip') as HTMLElement;
    expect(component.userOrg?.logoUrl).toBe('https://example.com/org-logo.png');
    expect(component.showOrganizationHero).toBeTrue();
    expect(component.heroBackgroundImage).toContain('https://example.com/org-logo.png');
    expect(hero.style.backgroundImage).toContain('https://example.com/org-logo.png');
    expect(hero.classList.contains('hero--organization')).toBeTrue();
    expect(chip.textContent).toContain('Seu grupo');
    expect(chip.textContent).toContain('ACNSB');
  });

  it('deve voltar para background padrao quando logo da organizacao falhar', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.getUserOrganizationId.and.returnValue(1);

    fixture.detectChanges();
    component.onOrganizationHeroImageError();
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero') as HTMLElement;
    expect(component.showOrganizationHero).toBeFalse();
    expect(hero.style.backgroundImage).toContain('assets/backgrounds/Capoeira_Bonfim.jpg');
  });

  it('nao deve mostrar painel de setup para usuario ja vinculado a organizacao', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.getUserOrganizationId.and.returnValue(1);

    fixture.detectChanges();

    const setupSection = fixture.nativeElement.querySelector('.setup-section');
    expect(component.hasOrganizationMembership).toBeTrue();
    expect(setupSection).toBeNull();
  });

  it('deve mostrar painel de setup para usuario logado sem organizacao', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.getUserOrganizationId.and.returnValue(null);

    fixture.detectChanges();

    const setupSection = fixture.nativeElement.querySelector('.setup-section');
    expect(component.hasOrganizationMembership).toBeFalse();
    expect(setupSection).toBeTruthy();
  });

  it('deve resolver organizationId em formato string e usar background da organizacao', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.getUserOrganizationId.and.returnValue('1' as unknown as number);

    fixture.detectChanges();

    component.onOrganizationHeroImageLoad();
    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero') as HTMLElement;
    expect(component.userOrg?.name).toBe('ACNSB');
    expect(component.showOrganizationHero).toBeTrue();
    expect(hero.style.backgroundImage).toContain('https://example.com/org-logo.png');
  });

  it('deve usar imagem mock quando organizacao logada nao tiver logo', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.getUserOrganizationId.and.returnValue(1);
    organizationServiceMock.getOrganizations.and.returnValue(of([{ ...organization, logoUrl: undefined }]));

    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero') as HTMLElement;
    expect(component.showOrganizationHero).toBeFalse();
    expect(component.showOrganizationNameOnlyHero).toBeFalse();
    expect(component.heroBackgroundImage).toContain('assets/backgrounds/Capoeira_Bonfim.jpg');
    expect(hero.style.backgroundImage).toContain('assets/backgrounds/Capoeira_Bonfim.jpg');
    expect(hero.classList.contains('hero--name-only')).toBeFalse();
  });

  it('deve manter hero de organizacao mesmo quando org nao for resolvida no carregamento', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.getUserOrganizationId.and.returnValue(1);
    organizationServiceMock.getOrganizations.and.returnValue(of([]));

    fixture.detectChanges();

    const hero = fixture.nativeElement.querySelector('.hero') as HTMLElement;
    const setupSection = fixture.nativeElement.querySelector('.setup-section');
    expect(component.hasOrganizationMembership).toBeTrue();
    expect(component.showOrganizationHero).toBeFalse();
    expect(component.showOrganizationNameOnlyHero).toBeFalse();
    expect(hero.style.backgroundImage).toContain('assets/backgrounds/Capoeira_Bonfim.jpg');
    expect(hero.classList.contains('hero--name-only')).toBeFalse();
    expect(setupSection).toBeNull();
  });
});


