import { Injectable } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { Event } from '../../../models/event.model';
import { EventVisibilityFilter, EventsStore } from '../state/events.store';

@Injectable({ providedIn: 'root' })
export class EventsFacade {
  readonly events = this.store.events;
  readonly filteredEvents = this.store.filteredEvents;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly searchTerm = this.store.searchTerm;
  readonly visibility = this.store.visibility;

  constructor(
    private readonly store: EventsStore,
    private readonly eventsService: EventService,
    private readonly auth: AuthService
  ) {}

  loadEvents(): void {
    this.store.setLoading(true);
    this.store.setError(null);

    this.eventsService.getVisibleEvents()
      .pipe(finalize(() => this.store.setLoading(false)))
      .subscribe({
        next: events => {
          this.store.setEvents(events);
          // Mantem o mesmo comportamento do componente legado.
          setTimeout(() => this.eventsService.markEventsAsSeen(events.map(e => e.id)), 0);
        },
        error: () => this.store.setError('Nao foi possivel carregar os eventos.')
      });
  }

  refresh(): void {
    this.loadEvents();
  }

  setSearchTerm(value: string): void {
    this.store.setSearchTerm(value);
  }

  setVisibility(value: EventVisibilityFilter): void {
    this.store.setVisibility(value);
  }

  resetFilters(): void {
    this.store.resetFilters();
  }

  canCreateEvent(): boolean {
    return this.auth.isAdmin();
  }

  isNew(event: Event): boolean {
    return this.eventsService.isEventNew(event);
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }
}


