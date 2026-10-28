import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { Event } from '../../../models/event.model';
import { EventsFacade } from '../../../features/events/facades/events.facade';
import { EventVisibilityFilter } from '../../../features/events/state/events.store';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss']
})
export class EventsListComponent implements OnInit {
  readonly events = this.eventsFacade.events;
  readonly loading = this.eventsFacade.loading;

  constructor(
    public auth: AuthService,
    private eventsFacade: EventsFacade
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventsFacade.loadEvents();
  }

  get searchTerm(): string {
    return this.eventsFacade.searchTerm();
  }

  set searchTerm(value: string) {
    this.eventsFacade.setSearchTerm(value);
  }

  get filterVisibility(): EventVisibilityFilter {
    return this.eventsFacade.visibility();
  }

  set filterVisibility(value: EventVisibilityFilter) {
    this.eventsFacade.setVisibility(value);
  }

  get filtered(): Event[] {
    return this.eventsFacade.filteredEvents();
  }

  formatDate(iso: string): string {
    return this.eventsFacade.formatDate(iso);
  }

  formatTime(iso: string): string {
    return this.eventsFacade.formatTime(iso);
  }

  isNew(event: Event): boolean {
    return this.eventsFacade.isNew(event);
  }

  formatCurrency(value: number | null | undefined): string {
    return this.eventsFacade.formatCurrency(value);
  }
}
