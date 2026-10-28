import { Component, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (n of visible; track n.id) {
        <div class="toast" [class]="'toast--' + n.type">
          <span class="material-icons toast-icon">
            {{ n.type === 'success' ? 'check_circle' : n.type === 'warning' ? 'warning' : 'notifications' }}
          </span>
          <span class="toast-msg">{{ n.message }}</span>
        </div>
      }
    </div>
  `,
  styleUrls: ['./notification-toast.component.scss']
})
export class NotificationToastComponent implements OnDestroy {
  visible: Notification[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private seenIds = new Set<number>();

  constructor(private ns: NotificationService) {
    effect(() => {
      const notifications = this.ns.notifications();
      if (!notifications.length) return;

      const latest = notifications[0];
      if (latest.read || this.seenIds.has(latest.id)) return;

      this.seenIds.add(latest.id);
      this.visible = [latest, ...this.visible].slice(0, 3);

      const t = setTimeout(() => {
        this.visible = this.visible.filter(n => n.id !== latest.id);
      }, 4000);
      this.timers.push(t);
    });
  }

  ngOnDestroy(): void {
    this.timers.forEach(t => clearTimeout(t));
  }
}
