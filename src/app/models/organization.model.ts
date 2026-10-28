export interface Organization {
  id: number;
  /** null = root/parent org; number = ID of the parent → this is a unit */
  parentOrganizationId: number | null;
  name: string;
  slug: string;
  description: string;
  city: string;
  state: string;
  country: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  joinCode: string;
  logoUrl?: string;
  active: boolean;
}
