import { Injectable, signal } from '@angular/core';
import { EventService } from './event.service';

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount   = () => this._notifications().filter(n => !n.read).length;

  constructor(private eventService: EventService) {
    this.eventService.newEventAlert$.subscribe(msg => this.push(msg, 'info'));
  }

  push(message: string, type: Notification['type'] = 'info'): void {
    this._notifications.update(ns => [
      { id: Date.now(), message, type, timestamp: new Date(), read: false },
      ...ns
    ]);
  }
}
