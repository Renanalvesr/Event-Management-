import { Injectable, computed, signal } from '@angular/core';
import { Event } from '../../../models/event.model';

export type EventVisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';

interface EventsState {
  events: Event[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  visibility: EventVisibilityFilter;
}

const initialState: EventsState = {
  events: [],
  loading: false,
  error: null,
  searchTerm: '',
  visibility: 'ALL'
};

@Injectable({ providedIn: 'root' })
export class EventsStore {
  private readonly state = signal<EventsState>(initialState);

  readonly events = computed(() => this.state().events);
  readonly loading = computed(() => this.state().loading);
  readonly error = computed(() => this.state().error);
  readonly searchTerm = computed(() => this.state().searchTerm);
  readonly visibility = computed(() => this.state().visibility);

  readonly filteredEvents = computed(() => {
    const events = this.events();
    const searchTerm = this.searchTerm().trim().toLowerCase();
    const visibility = this.visibility();

    return events.filter(event => {
      const matchesVisibility = visibility === 'ALL' || event.visibility === visibility;
      const matchesSearch =
        !searchTerm ||
        event.title.toLowerCase().includes(searchTerm) ||
        event.location.toLowerCase().includes(searchTerm);

      return matchesVisibility && matchesSearch;
    });
  });

  setLoading(value: boolean): void {
    this.patch({ loading: value });
  }

  setError(message: string | null): void {
    this.patch({ error: message });
  }

  setEvents(events: Event[]): void {
    this.patch({ events });
  }

  setSearchTerm(value: string): void {
    this.patch({ searchTerm: value });
  }

  setVisibility(value: EventVisibilityFilter): void {
    this.patch({ visibility: value });
  }

  resetFilters(): void {
    this.patch({ searchTerm: '', visibility: 'ALL' });
  }

  clear(): void {
    this.state.set(initialState);
  }

  private patch(partial: Partial<EventsState>): void {
    this.state.update(current => ({ ...current, ...partial }));
  }
}

