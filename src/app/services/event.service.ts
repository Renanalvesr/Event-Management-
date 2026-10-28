import { Injectable, signal } from '@angular/core';
import { Observable, of, delay, Subject, map, catchError, throwError } from 'rxjs';
import { Event, EventCreateRequest } from '../models/event.model';
import { AuthService } from './auth.service';
import { OrganizationService } from './organization.service';
import { EventFirebaseService } from './event-firebase.service';

@Injectable({ providedIn: 'root' })
export class EventService {
  private events = signal<Event[]>([]);
  private readonly newEventDays = 14;

  readonly newEventAlert$ = new Subject<string>();

  constructor(
    private auth: AuthService,
    private orgService: OrganizationService,
    private firebaseEvents: EventFirebaseService
  ) {}

  private seenKey(): string {
    const userId = this.auth.currentUser()?.id ?? 'guest';
    return `capoeira_seen_events_${userId}`;
  }

  private getSeenSet(): Set<number> {
    try {
      const raw = localStorage.getItem(this.seenKey());
      return new Set(raw ? JSON.parse(raw) as number[] : []);
    } catch { return new Set(); }
  }

  private saveSeenSet(seen: Set<number>): void {
    localStorage.setItem(this.seenKey(), JSON.stringify(Array.from(seen)));
  }

  markEventAsSeen(eventId: number): void {
    const seen = this.getSeenSet(); seen.add(eventId); this.saveSeenSet(seen);
  }

  markEventsAsSeen(eventIds: number[]): void {
    if (!eventIds.length) return;
    const seen = this.getSeenSet();
    eventIds.forEach(id => seen.add(id));
    this.saveSeenSet(seen);
  }

  isEventNew(event: Event): boolean {
    if (this.getSeenSet().has(event.id)) return false;
    const ageDays = (Date.now() - new Date(event.createdAt).getTime()) / 86_400_000;
    return ageDays <= this.newEventDays;
  }

  /**
   * Retorna eventos visíveis para o usuário atual:
   *
   * PUBLIC → todos
   *
   * PRIVATE em org RAIZ (parentOrganizationId = null):
   *   → visível para TODA a família (sede + todas as unidades)
   *
   * PRIVATE em UNIDADE (parentOrganizationId != null):
   *   → visível APENAS para membros daquela unidade + org SUPER_ADMIN
   *
   * Platform SUPER_ADMIN (sem org) → vê tudo
   */
  getVisibleEvents(): Observable<Event[]> {
    return this.loadAllEvents().pipe(map(events => this.filterVisibleEvents(events)));
  }

  getEventById(id: number): Observable<Event | undefined> {
    return this.loadAllEvents().pipe(
      map(events => events.find(e => e.id === id)),
      delay(120)
    );
  }

  private loadAllEvents(): Observable<Event[]> {
    return this.firebaseEvents.getAllEvents().pipe(
      map(events => {
        const source = events.length ? events : this.events();
        const activeEvents = source.filter(event => event.active !== false);
        this.events.set(activeEvents);
        return activeEvents;
      }),
      catchError(() => of(this.events().filter(event => event.active !== false))),
      delay(120)
    );
  }

  private filterVisibleEvents(events: Event[]): Event[] {
   const orgId = this.auth.getUserOrganizationId();
   const isPlatformAdmin = this.auth.isPlatformSuperAdmin();
   const isOrgSuperAdmin = this.auth.isOrgSuperAdmin();

   const orgFamily: number[] = orgId ? this.orgService.getOrganizationFamilySync(orgId) : [];
   const userRootId: number | null = orgId
     ? (orgFamily.find(id => this.orgService.getByIdSync(id)?.parentOrganizationId === null) ?? null)
     : null;

   const visible = events.filter(e => {
     if (!e.active) return false;
     if (e.visibility === 'PUBLIC') return true;
     if (isPlatformAdmin) return true;
     if (!orgId || e.organizationId === null) return false;

     const eventOrg = this.orgService.getByIdSync(e.organizationId);
     if (!eventOrg) return false;

     if (eventOrg.parentOrganizationId === null) {
       return orgFamily.includes(eventOrg.id);
     }

     if (isOrgSuperAdmin && userRootId !== null) {
       return eventOrg.parentOrganizationId === userRootId;
     }

     return eventOrg.id === orgId;
   });

   visible.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
   return visible;
  }

  createEvent(req: EventCreateRequest): Observable<Event> {
   if (!this.firebaseEvents.canUseFirestore()) {
     return throwError(() => new Error('Firestore indisponivel para criacao de evento.'));
   }

   return this.firebaseEvents.createEvent(req).pipe(
     map(created => {
       if (!created) {
         throw new Error('Falha ao criar evento no Firestore.');
       }
       this.events.update(evts => [...evts.filter(e => e.id !== created.id), created]);
       if (created.visibility === 'PUBLIC') {
         setTimeout(() => this.newEventAlert$.next(`Novo evento: ${created.title}`), 500);
       }
       return created;
     }),
     catchError(err => {
       console.error('Erro ao criar evento:', err);
       return throwError(() => err);
     })
   );
  }

  uploadEventImage(_file: File): Observable<string> {
   return of('');
  }

  updateEvent(id: number, changes: Partial<Event>): Observable<Event> {
   return this.firebaseEvents.updateEvent(id, changes).pipe(
     map(() => {
       this.events.update(evts => evts.map(e => e.id === id ? { ...e, ...changes } : e));
       return this.events().find(e => e.id === id)!;
     }),
     catchError(err => {
       console.error('Erro ao atualizar evento:', err);
       this.events.update(evts => evts.map(e => e.id === id ? { ...e, ...changes } : e));
       const updated = this.events().find(e => e.id === id)!;
       return of(updated);
     })
   );
  }

  deleteEvent(id: number): Observable<void> {
   return this.updateEvent(id, { active: false }).pipe(map(() => void 0));
  }

  toggleSaleItemInterest(eventId: number, itemName: string, userId: number): Observable<Event | undefined> {
   const norm = itemName.trim().toLowerCase();
   const currentEvent = this.events().find(e => e.id === eventId);

   if (!currentEvent) {
     return of(undefined);
   }

   const updatedItems = (currentEvent.saleItems ?? []).map(item => {
     if (item.name.trim().toLowerCase() !== norm) return item;
     const already = item.interestedUserIds.includes(userId);
     return {
       ...item,
       interestedUserIds: already
         ? item.interestedUserIds.filter(id => id !== userId)
         : [...item.interestedUserIds, userId]
     };
   });

   return this.updateEvent(eventId, { saleItems: updatedItems }).pipe(
     map(updated => {
       this.events.update(evts =>
         evts.map(evt => evt.id === eventId ? updated : evt)
       );
       return updated;
     })
   );
  }
}
