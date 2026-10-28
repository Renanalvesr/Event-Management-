import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../services/auth.service';

describe('NavbarComponent (template)', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;

  let authMock: {
    isAdmin: jasmine.Spy;
    isSuperAdmin: jasmine.Spy;
    isLoggedIn: jasmine.Spy;
    currentUser: jasmine.Spy;
    logout: jasmine.Spy;
  };

  const loggedUser = {
    id: 7,
    name: 'Renan',
    email: 'renan@capoeira.com',
    avatarUrl: 'https://example.com/avatar.png'
  };

  beforeEach(async () => {
    authMock = {
      isAdmin: jasmine.createSpy('isAdmin').and.returnValue(false),
      isSuperAdmin: jasmine.createSpy('isSuperAdmin').and.returnValue(false),
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
      currentUser: jasmine.createSpy('currentUser').and.returnValue(null),
      logout: jasmine.createSpy('logout')
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
  });

  function render(): void {
    fixture.detectChanges();
  }

  function pageText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('deve mostrar Entrar/Cadastrar quando usuario nao estiver logado', () => {
    authMock.isLoggedIn.and.returnValue(false);
    authMock.currentUser.and.returnValue(null);

    render();

    expect(pageText()).toContain('Entrar');
    expect(pageText()).toContain('Cadastrar');
    expect(pageText()).not.toContain('Sair');
  });

  it('deve mostrar nome e botao Sair quando usuario estiver logado', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.currentUser.and.returnValue(loggedUser);

    render();

    const name = fixture.nativeElement.querySelector('.user-name') as HTMLElement;
    expect(name.textContent).toContain('Renan');
    expect(pageText()).toContain('Sair');
  });

  it('deve mostrar links de admin quando isAdmin for true', () => {
    authMock.isAdmin.and.returnValue(true);

    render();

    expect(pageText()).toContain('+ Criar Evento');
    expect(pageText()).toContain('Usuários');
  });

  it('deve mostrar link Organizacao quando isSuperAdmin for true', () => {
    authMock.isSuperAdmin.and.returnValue(true);

    render();

    expect(pageText()).toContain('Organização');
  });

  it('nao deve exibir o sininho de notificacao', () => {
    render();

    const bellButton = fixture.nativeElement.querySelector('.bell-btn');
    const badge = fixture.nativeElement.querySelector('.badge-dot');

    expect(bellButton).toBeNull();
    expect(badge).toBeNull();
  });

  it('deve chamar logout ao clicar no botao Sair', () => {
    authMock.isLoggedIn.and.returnValue(true);
    authMock.currentUser.and.returnValue(loggedUser);

    render();

    const logoutButton = fixture.nativeElement.querySelector('.btn-outline.btn-sm') as HTMLButtonElement;
    logoutButton.click();

    expect(authMock.logout).toHaveBeenCalled();
  });

  it('deve abrir o menu mobile ao clicar no hamburger', () => {
    render();

    const hamburger = fixture.nativeElement.querySelector('.hamburger') as HTMLButtonElement;
    hamburger.click();
    fixture.detectChanges();

    expect(component.menuOpen()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.mobile-menu')).toBeTruthy();
  });
});

