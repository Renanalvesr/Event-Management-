import { Component, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { AuthService } from '../../../services/auth.service';
import { Event, EventSaleItem } from '../../../models/event.model';
import { User } from '../../../models/user.model';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements OnInit {
  event = signal<Event | null>(null);
  loading = signal(true);
  deleting = signal(false);
  imageModalOpen = signal(false);

  constructor(
    public auth: AuthService,
    private eventService: EventService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isNaN(id) && id > 0) {
      this.eventService.markEventAsSeen(id);
    }
    this.eventService.getEventById(id).subscribe(evt => {
      this.event.set(evt ?? null);
      this.loading.set(false);
    });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  openWhatsApp(): void {
    const e = this.event();
    if (!e) return;
    const phone = (e.contactWhatsapp ?? e.contactPhone).replace(/\D/g, '');
    window.open(`https://wa.me/${phone}`, '_blank');
  }

  openMaps(): void {
    const e = this.event();
    if (!e) return;
    const url = e.locationUrl ?? `https://maps.google.com?q=${encodeURIComponent(e.location)}`;
    window.open(url, '_blank');
  }

  openImage(): void {
    if (!this.event()?.imageUrl) return;
    this.imageModalOpen.set(true);
  }

  closeImageModal(): void {
    this.imageModalOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscPressed(): void {
    if (this.imageModalOpen()) {
      this.closeImageModal();
    }
  }

  deleteEvent(): void {
    if (!confirm('Excluir este evento?')) return;
    const e = this.event();
    if (!e) return;
    this.deleting.set(true);
    this.eventService.deleteEvent(e.id).subscribe(() => {
      this.router.navigate(['/eventos']);
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  isInterested(item: EventSaleItem): boolean {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return false;
    return item.interestedUserIds.includes(userId);
  }

  toggleInterest(item: EventSaleItem): void {
    const e = this.event();
    const userId = this.auth.currentUser()?.id;
    if (!e || !userId) return;

    this.eventService.toggleSaleItemInterest(e.id, item.name, userId).subscribe(updated => {
      if (updated) this.event.set(updated);
    });
  }

  getInterestedUsers(item: EventSaleItem): User[] {
    const allUsers = this.auth.getUsersSnapshot();
    return allUsers.filter(user => item.interestedUserIds.includes(user.id));
  }

  getInterestedUsersText(item: EventSaleItem): string {
    return this.getInterestedUsers(item).map(user => user.name).join(', ');
  }
}
