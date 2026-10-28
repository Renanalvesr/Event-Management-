export type EventVisibility = 'PUBLIC' | 'PRIVATE';

export interface EventSaleItem {
  name: string;
  price: number;
  interestedUserIds: number[];
}

export interface Event {
  id: number;
  organizationId: number | null;
  title: string;
  description: string;
  startDate: string;   // ISO datetime string
  endDate: string;     // ISO datetime string
  location: string;
  locationUrl?: string | null;
  contactPhone: string;
  contactWhatsapp?: string | null;
  imageUrl: string;
  visibility: EventVisibility;
  isPaid?: boolean;
  ticketPrice?: number | null;
  saleItems?: EventSaleItem[];
  active: boolean;
  createdAt: string;
}

export interface EventCreateRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  locationUrl?: string;
  contactPhone: string;
  imageUrl?: string;
  visibility: EventVisibility;
  isPaid?: boolean;
  ticketPrice?: number | null;
  saleItems?: EventSaleItem[];
  organizationId?: number | null;
}
