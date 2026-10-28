import { Injectable, Optional } from '@angular/core';
import { Observable, of, from, map, catchError } from 'rxjs';
import { Event, EventCreateRequest } from '../models/event.model';
import { Firestore, collection, query, getDocs, addDoc, updateDoc, doc, Timestamp } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class EventFirebaseService {
  private firestoreEnabled = true;
  private readonly defaultImageUrl = 'https://event-bonfim-picture-bucket.s3.sa-east-1.amazonaws.com/bonfimEvento.jpeg';

  constructor(@Optional() private firestore: Firestore | null) {}

  canUseFirestore(): boolean {
    return !!this.firestore && this.firestoreEnabled;
  }

  getAllEvents(): Observable<Event[]> {
    if (!this.canUseFirestore()) return of([]);

    return from(this.fetchEventsFromFirestore()).pipe(
      catchError(() => of([]))
    );
  }

  createEvent(req: EventCreateRequest): Observable<Event | null> {
    if (!this.canUseFirestore()) return of(null);

    return from(this.addEventToFirestore(req)).pipe(
      catchError(err => {
        this.handleFirestoreError(err);
        return of(null);
      })
    );
  }

  updateEvent(id: number, changes: Partial<Event>): Observable<boolean> {
    if (!this.canUseFirestore()) return of(false);

    return from(this.updateEventInFirestore(id, changes)).pipe(
      map(() => true),
      catchError(err => {
        this.handleFirestoreError(err);
        return of(false);
      })
    );
  }

  private async fetchEventsFromFirestore(): Promise<Event[]> {
    try {
      const eventsCol = collection(this.firestore!, 'events_v2');
      const snapshot = await getDocs(query(eventsCol));

      return snapshot.docs
        .map(row => this.firestoreDocToEvent(row.data(), row.id))
        .filter((event): event is Event => !!event);
    } catch (err) {
      this.handleFirestoreError(err);
      return [];
    }
  }

  private firestoreDocToEvent(data: Record<string, unknown>, docId: string): Event | null {
    if (!data) return null;

    const startDateRaw = data['startDate'];
    const endDateRaw = data['endDate'];
    const createdAtRaw = data['createdAt'];

    const startDate = startDateRaw instanceof Timestamp
      ? startDateRaw.toDate().toISOString()
      : (typeof startDateRaw === 'string' ? startDateRaw : new Date().toISOString());
    const endDate = endDateRaw instanceof Timestamp
      ? endDateRaw.toDate().toISOString()
      : (typeof endDateRaw === 'string' ? endDateRaw : new Date().toISOString());
    const createdAt = createdAtRaw instanceof Timestamp
      ? createdAtRaw.toDate().toISOString()
      : (typeof createdAtRaw === 'string' ? createdAtRaw : new Date().toISOString());

    return {
      id: this.toNumber(data['id']) ?? (parseInt(docId.substring(0, 8), 36) || 0),
      organizationId: this.toNullableNumber(data['organizationId']),
      title: this.toStringValue(data['title']) ?? 'Evento sem titulo',
      description: this.toStringValue(data['description']) ?? '',
      startDate,
      endDate,
      location: this.toStringValue(data['location']) ?? 'Local a confirmar',
      locationUrl: this.toStringValue(data['locationUrl']) ?? null,
      contactPhone: this.toStringValue(data['contactPhone']) ?? '',
      contactWhatsapp: this.toStringValue(data['contactWhatsapp']) ?? null,
      imageUrl: this.toStringValue(data['imageUrl']) ?? this.defaultImageUrl,
      visibility: this.toStringValue(data['visibility']) === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      isPaid: this.toBooleanValue(data['isPaid']) ?? false,
      ticketPrice: this.toNullableNumber(data['ticketPrice']),
      saleItems: Array.isArray(data['saleItems']) ? data['saleItems'] as Event['saleItems'] : [],
      active: this.toBooleanValue(data['active']) ?? true,
      createdAt
    };
  }

  private async addEventToFirestore(req: EventCreateRequest): Promise<Event> {
    const payload = {
      ...req,
      startDate: new Date(req.startDate),
      endDate: new Date(req.endDate),
      createdAt: new Date(),
      imageUrl: req.imageUrl || this.defaultImageUrl,
      active: true,
      saleItems: req.saleItems ?? []
    };

    const eventsCol = collection(this.firestore!, 'events_v2');
    const docRef = await addDoc(eventsCol, payload);
    const numericId = parseInt(docRef.id.substring(0, 8), 36);
    await updateDoc(docRef, { id: numericId });

    return {
      ...req,
      id: numericId,
      organizationId: req.organizationId ?? null,
      imageUrl: req.imageUrl || this.defaultImageUrl,
      active: true,
      createdAt: new Date().toISOString()
    };
  }

  private async updateEventInFirestore(id: number, changes: Partial<Event>): Promise<void> {
    const eventsCol = collection(this.firestore!, 'events_v2');
    const snapshot = await getDocs(query(eventsCol));

    let docId: string | null = null;
    for (const row of snapshot.docs) {
      const rowId = this.toNumber((row.data() as Record<string, unknown>)['id']);
      if (rowId === id) {
        docId = row.id;
        break;
      }
    }

    if (!docId) return;

    const payload: Record<string, unknown> = {};
    if (changes.startDate) payload['startDate'] = new Date(changes.startDate);
    if (changes.endDate) payload['endDate'] = new Date(changes.endDate);

    Object.entries(changes).forEach(([key, value]) => {
      if (key !== 'startDate' && key !== 'endDate' && value !== undefined) {
        payload[key] = value;
      }
    });

    await updateDoc(doc(this.firestore!, 'events_v2', docId), payload);
  }

  private handleFirestoreError(err: unknown): void {
    const message = String((err as { message?: string } | null)?.message ?? '');
    if (message.includes('CONFIGURATION_NOT_FOUND')) {
      this.firestoreEnabled = false;
      return;
    }
    console.error('Erro Firestore (eventos):', err);
  }

  private toStringValue(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private toNullableNumber(value: unknown): number | null {
    return this.toNumber(value);
  }

  private toBooleanValue(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return null;
  }
}

