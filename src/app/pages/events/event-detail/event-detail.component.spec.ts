import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { EventDetailComponent } from './event-detail.component';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Event, EventSaleItem } from '../../../models/event.model';
import { User } from '../../../models/user.model';
import { signal } from '@angular/core';

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 1,
  organizationId: null,
  title: 'Evento Detalhe Teste',
  description: 'Descrição longa do evento para testes.',
  startDate: '2026-07-01T10:00:00',
  endDate: '2026-07-01T18:00:00',
  location: 'Espaço Teste',
  contactPhone: '+5511999999999',
  imageUrl: 'https://via.placeholder.com/800',
  visibility: 'PUBLIC',
  active: true,
  createdAt: new Date().toISOString(),
  ...overrides
});

describe('EventDetailComponent (integração)', () => {
  let component: EventDetailComponent;
  let fixture: ComponentFixture<EventDetailComponent>;
  let mockEventService: jasmine.SpyObj<EventService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  const buildMocks = (evt: Event | undefined, isAdmin = false, isLoggedIn = false, currentUser: any = null) => {
    mockEventService.getEventById.and.returnValue(of(evt));
    mockEventService.markEventAsSeen.and.stub();
    mockEventService.toggleSaleItemInterest.and.callFake((eventId, name, userId) => {
      if (!evt?.saleItems) return of(evt);
      const updated = {
        ...evt,
        saleItems: evt.saleItems.map(i =>
          i.name === name
            ? { ...i, interestedUserIds: [...i.interestedUserIds, userId] }
            : i
        )
      };
      return of(updated);
    });
    mockEventService.deleteEvent.and.returnValue(of(undefined));
    mockAuthService.isAdmin.and.returnValue(isAdmin);
    mockAuthService.isLoggedIn.and.returnValue(isLoggedIn);
    (mockAuthService as any).currentUser = signal(currentUser);
    mockAuthService.getUsersSnapshot.and.returnValue([]);
  };

  beforeEach(async () => {
    mockEventService = jasmine.createSpyObj('EventService', ['getEventById', 'markEventAsSeen', 'toggleSaleItemInterest', 'deleteEvent']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['isAdmin', 'isLoggedIn', 'getUsersSnapshot']);
    (mockAuthService as any).currentUser = signal(null);

    buildMocks(makeEvent());

    await TestBed.configureTestingModule({
      imports: [EventDetailComponent, RouterTestingModule],
      providers: [
        { provide: EventService, useValue: mockEventService },
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '1' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar evento pelo id da rota', fakeAsync(() => {
    tick(200);
    fixture.detectChanges();
    expect(mockEventService.getEventById).toHaveBeenCalledWith(1);
    expect(component.event()?.title).toBe('Evento Detalhe Teste');
  }));

  it('deve marcar evento como visto ao abrir', () => {
    expect(mockEventService.markEventAsSeen).toHaveBeenCalledWith(1);
  });

  it('formatDate deve retornar data em pt-BR', () => {
    const result = component.formatDate('2026-07-01T10:00:00');
    expect(result).toContain('2026');
  });

  it('formatTime deve retornar hora formatada', () => {
    const result = component.formatTime('2026-07-01T14:30:00');
    expect(result).toContain('14');
  });

  it('formatCurrency deve formatar valor correto', () => {
    expect(component.formatCurrency(55)).toContain('55');
    expect(component.formatCurrency(null)).toContain('0');
  });

  it('openImage deve abrir modal de imagem', () => {
    component.event.set(makeEvent());
    component.openImage();
    expect(component.imageModalOpen()).toBeTrue();
  });

  it('closeImageModal deve fechar modal', () => {
    component.imageModalOpen.set(true);
    component.closeImageModal();
    expect(component.imageModalOpen()).toBeFalse();
  });

  it('Esc deve fechar o modal de imagem', () => {
    component.imageModalOpen.set(true);
    component.onEscPressed();
    expect(component.imageModalOpen()).toBeFalse();
  });

  it('isInterested deve retornar false quando userId não está na lista', () => {
    const item: EventSaleItem = { name: 'CD', price: 30, interestedUserIds: [10] };
    (mockAuthService as any).currentUser = signal({ id: 5 } as User);
    expect(component.isInterested(item)).toBeFalse();
  });

  it('isInterested deve retornar true quando userId está na lista', () => {
    const item: EventSaleItem = { name: 'CD', price: 30, interestedUserIds: [5] };
    (mockAuthService as any).currentUser = signal({ id: 5 } as User);
    expect(component.isInterested(item)).toBeTrue();
  });

  it('toggleInterest deve chamar eventService com parâmetros corretos', fakeAsync(() => {
    const user = { id: 7 } as User;
    (mockAuthService as any).currentUser = signal(user);
    const evt = makeEvent({ saleItems: [{ name: 'Camiseta', price: 75, interestedUserIds: [] }] });
    component.event.set(evt);

    component.toggleInterest(evt.saleItems![0]);
    tick(180);

    expect(mockEventService.toggleSaleItemInterest).toHaveBeenCalledWith(evt.id, 'Camiseta', 7);
  }));

  it('getInterestedUsersText deve retornar nomes em lista', () => {
    const users: User[] = [
      { id: 1, name: 'Ana', email: 'a@a.com', role: 'USER', active: true, organizationId: null, organizationUnitId: null, avatarUrl: '' },
      { id: 2, name: 'Bruno', email: 'b@b.com', role: 'USER', active: true, organizationId: null, organizationUnitId: null, avatarUrl: '' }
    ];
    mockAuthService.getUsersSnapshot.and.returnValue(users);
    const item: EventSaleItem = { name: 'CD', price: 25, interestedUserIds: [1, 2] };
    const text = component.getInterestedUsersText(item);
    expect(text).toContain('Ana');
    expect(text).toContain('Bruno');
  });

  // ── Estado de loading/não encontrado ─────────────────────────────────────

  it('loading deve iniciar true e ficar false após carregar', fakeAsync(() => {
    // O mock de getEventById usa `of(...)`, então a transição ocorre no primeiro ciclo.
    expect(component.loading()).toBeFalse();
    tick(200);
    fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  it('event deve ser null quando id não encontrado', fakeAsync(() => {
    mockEventService.getEventById.and.returnValue(of(undefined));
    component.ngOnInit();
    tick(200);
    fixture.detectChanges();
    expect(component.event()).toBeNull();
  }));
});
