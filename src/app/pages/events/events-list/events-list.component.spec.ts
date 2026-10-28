import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { EventsListComponent } from './events-list.component';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { Event } from '../../../models/event.model';

const makeEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 1,
  organizationId: null,
  title: 'Evento Público Teste',
  description: 'Desc',
  startDate: '2026-07-01T10:00:00',
  endDate: '2026-07-01T18:00:00',
  location: 'Espaço Teste',
  contactPhone: '+5511999999999',
  imageUrl: 'https://via.placeholder.com/400',
  visibility: 'PUBLIC',
  active: true,
  createdAt: new Date().toISOString(),
  ...overrides
});

describe('EventsListComponent (integração)', () => {
  let component: EventsListComponent;
  let fixture: ComponentFixture<EventsListComponent>;
  let mockEventService: jasmine.SpyObj<EventService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockEventService = jasmine.createSpyObj('EventService', ['getVisibleEvents', 'markEventsAsSeen', 'isEventNew']);
    mockEventService.getVisibleEvents.and.returnValue(of([makeEvent()]));
    mockEventService.markEventsAsSeen.and.stub();
    mockEventService.isEventNew.and.returnValue(false);

    mockAuthService = jasmine.createSpyObj('AuthService', ['isAdmin', 'isMember', 'isLoggedIn']);
    mockAuthService.isAdmin.and.returnValue(false);
    mockAuthService.isMember.and.returnValue(false);
    mockAuthService.isLoggedIn.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [EventsListComponent, RouterTestingModule],
      providers: [
        { provide: EventService, useValue: mockEventService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EventsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar eventos ao iniciar', fakeAsync(() => {
    tick(300);
    fixture.detectChanges();
    expect(mockEventService.getVisibleEvents).toHaveBeenCalled();
    expect(component.events().length).toBe(1);
  }));

  it('deve filtrar eventos por título na busca', fakeAsync(() => {
    mockEventService.getVisibleEvents.and.returnValue(of([
      makeEvent({ id: 1, title: 'Batizado Regional' }),
      makeEvent({ id: 2, title: 'Workshop de Capoeira' })
    ]));
    component.loadEvents();
    tick(300);
    fixture.detectChanges();

    component.searchTerm = 'Batizado';
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].title).toBe('Batizado Regional');
  }));

  it('deve filtrar por local na busca', fakeAsync(() => {
    mockEventService.getVisibleEvents.and.returnValue(of([
      makeEvent({ id: 1, title: 'A', location: 'Campinas' }),
      makeEvent({ id: 2, title: 'B', location: 'São Paulo' })
    ]));
    component.loadEvents();
    tick(300);
    fixture.detectChanges();

    component.searchTerm = 'Campinas';
    expect(component.filtered.length).toBe(1);
  }));

  it('deve filtrar por visibilidade PUBLIC', fakeAsync(() => {
    mockEventService.getVisibleEvents.and.returnValue(of([
      makeEvent({ id: 1, visibility: 'PUBLIC' }),
      makeEvent({ id: 2, visibility: 'PRIVATE' })
    ]));
    component.loadEvents();
    tick(300);
    fixture.detectChanges();

    component.filterVisibility = 'PUBLIC';
    expect(component.filtered.every(e => e.visibility === 'PUBLIC')).toBeTrue();
  }));

  it('deve mostrar todos os eventos com filtro ALL', fakeAsync(() => {
    mockEventService.getVisibleEvents.and.returnValue(of([
      makeEvent({ id: 1, visibility: 'PUBLIC' }),
      makeEvent({ id: 2, visibility: 'PRIVATE' })
    ]));
    component.loadEvents();
    tick(300);
    fixture.detectChanges();

    component.filterVisibility = 'ALL';
    expect(component.filtered.length).toBe(2);
  }));

  it('não deve mostrar botão "Criar" para usuário não-admin', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const createBtn = compiled.querySelector('a[href="/eventos/novo"]');
    expect(createBtn).toBeNull();
  });

  it('deve mostrar botão "Criar" para admin', async () => {
    mockAuthService.isAdmin.and.returnValue(true);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[routerLink="/eventos/novo"]')).toBeTruthy();
  });

  it('formatCurrency deve formatar valor em reais', () => {
    expect(component.formatCurrency(50)).toContain('50');
    expect(component.formatCurrency(null)).toContain('0');
  });

  it('isNew deve delegar para EventService.isEventNew', () => {
    mockEventService.isEventNew.and.returnValue(true);
    const evt = makeEvent();
    expect(component.isNew(evt)).toBeTrue();
    expect(mockEventService.isEventNew).toHaveBeenCalledWith(evt);
  });
});
