import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { EventCreateRequest, EventSaleItem } from '../../../models/event.model';
import { OrganizationService } from '../../../services/organization.service';
import { Organization } from '../../../models/organization.model';
import { AuthService } from '../../../services/auth.service';

/** Who can see this event */
export type EventScope = 'PUBLIC' | 'ORG' | 'UNIT';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.scss']
})
export class EventFormComponent implements OnInit {
  organizations: Organization[] = [];
  rootOrg: Organization | null = null;
  orgUnits: Organization[] = [];

  saving = signal(false);
  uploadingImage = signal(false);
  error = signal('');
  editingEventId: number | null = null;
  saleItemName = '';
  saleItemPrice: number | null = null;
  selectedImageName = '';

  /** Controls the visual scope selector */
  eventScope: EventScope = 'PUBLIC';

  form: EventCreateRequest = {
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    locationUrl: '',
    contactPhone: '',
    imageUrl: '',
    visibility: 'PUBLIC',
    isPaid: false,
    ticketPrice: null,
    saleItems: [],
    organizationId: null
  };

  constructor(
    private eventService: EventService,
    private orgService: OrganizationService,
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.orgService.getOrganizations().subscribe(orgs => {
      this.organizations = orgs;
      this._resolveOrgContext();
    });

    const editId = Number(this.route.snapshot.queryParamMap.get('edit'));
    if (!Number.isNaN(editId) && editId > 0) {
      this.editingEventId = editId;
      this.eventService.getEventById(editId).subscribe(evt => {
        if (!evt) {
          this.error.set('Evento não encontrado para edição.');
          return;
        }

        this.form = {
          title: evt.title,
          description: evt.description,
          startDate: evt.startDate.slice(0, 16),
          endDate: evt.endDate.slice(0, 16),
          location: evt.location,
          locationUrl: evt.locationUrl ?? '',
          contactPhone: evt.contactPhone,
          imageUrl: evt.imageUrl,
          visibility: evt.visibility,
          isPaid: !!evt.isPaid,
          ticketPrice: evt.ticketPrice ?? null,
          saleItems: (evt.saleItems ?? []).map(item => ({
            name: item.name,
            price: item.price,
            interestedUserIds: [...item.interestedUserIds]
          })),
          organizationId: evt.organizationId
        };

        // Derive scope from existing event data (after orgs are loaded)
        this._deriveScopeFromForm();
      });
    }
  }

  // ── Org context helpers ────────────────────────────────────────────────────

  private _resolveOrgContext(): void {
    const orgId = this.auth.getUserOrganizationId();
    if (!orgId) return;

    const myOrg = this.organizations.find(o => o.id === orgId);
    if (!myOrg) return;

    const rootId = myOrg.parentOrganizationId ?? myOrg.id;
    this.rootOrg = this.organizations.find(o => o.id === rootId) ?? null;
    this.orgUnits = this.organizations.filter(o => o.parentOrganizationId === rootId);

    // Also try to re-derive scope in case event data came before orgs
    this._deriveScopeFromForm();
  }

  private _deriveScopeFromForm(): void {
    if (this.form.visibility === 'PUBLIC') {
      this.eventScope = 'PUBLIC';
      return;
    }
    if (this.form.organizationId == null) {
      this.eventScope = 'PUBLIC';
      return;
    }
    const org = this.organizations.find(o => o.id === this.form.organizationId);
    if (!org) return;

    this.eventScope = org.parentOrganizationId === null ? 'ORG' : 'UNIT';
  }

  // ── Scope selector ─────────────────────────────────────────────────────────

  /** Whether scope option is available for the current user */
  canUseScope(scope: EventScope): boolean {
    if (scope === 'PUBLIC') return true;

    // ADMIN (unit-level): can publish PUBLIC or UNIT (their own unit only)
    if (!this.auth.isSuperAdmin()) {
      return scope === 'UNIT';
    }

    // Org / Platform SUPER_ADMIN: all scopes
    return true;
  }

  onScopeChange(): void {
    switch (this.eventScope) {
      case 'PUBLIC':
        this.form.visibility = 'PUBLIC';
        this.form.organizationId = null;
        break;

      case 'ORG':
        this.form.visibility = 'PRIVATE';
        if (this.auth.isPlatformSuperAdmin()) {
          // Platform admin must pick manually via dropdown
          this.form.organizationId = null;
        } else {
          this.form.organizationId = this.rootOrg?.id ?? null;
        }
        break;

      case 'UNIT':
        this.form.visibility = 'PRIVATE';
        if (!this.auth.isSuperAdmin()) {
          // Unit ADMIN: auto-assign their own unit
          this.form.organizationId = this.auth.getUserOrganizationId();
        } else if (this.auth.isPlatformSuperAdmin()) {
          this.form.organizationId = null;
        } else {
          // Org SUPER_ADMIN: default to first unit or keep previous selection
          const currentUnitId = this.form.organizationId;
          const isAlreadyUnit = currentUnitId &&
            this.orgUnits.some(u => u.id === currentUnitId);
          if (!isAlreadyUnit) {
            this.form.organizationId = this.orgUnits[0]?.id ?? null;
          }
        }
        break;
    }
  }

  // ── Org / unit dropdowns for admins ───────────────────────────────────────

  /** Root orgs available for the ORG scope (platform admin sees all roots; others see their own) */
  get availableRootOrgs(): Organization[] {
    if (this.auth.isPlatformSuperAdmin()) {
      return this.organizations.filter(o => o.parentOrganizationId === null);
    }
    return this.rootOrg ? [this.rootOrg] : [];
  }

  /** Units available for the UNIT scope */
  get availableUnits(): Organization[] {
    if (this.auth.isPlatformSuperAdmin()) {
      // Platform admin: show all orgs/units
      return this.organizations;
    }
    if (this.auth.isOrgSuperAdmin() && this.rootOrg) {
      // Show units of their org
      return this.orgUnits;
    }
    // Unit ADMIN: no choice
    return [];
  }

  get currentUnitName(): string {
    const orgId = this.auth.getUserOrganizationId();
    const unit = this.organizations.find(o => o.id === orgId);
    return unit?.name ?? 'Sua unidade';
  }

  // ── Existing helpers ───────────────────────────────────────────────────────

  get isSuperAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  onPaidChange(): void {
    if (!this.form.isPaid) {
      this.form.ticketPrice = null;
    }
  }

  addSaleItem(): void {
    const name = this.saleItemName.trim();
    const price = Number(this.saleItemPrice);

    if (!name) {
      this.error.set('Informe o nome do item à venda.');
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      this.error.set('Informe um valor válido para o item à venda.');
      return;
    }

    const current = this.form.saleItems ?? [];
    if (current.some(i => i.name.trim().toLowerCase() === name.toLowerCase())) {
      this.error.set('Esse item já foi adicionado.');
      return;
    }

    const newItem: EventSaleItem = { name, price, interestedUserIds: [] };
    this.form.saleItems = [...current, newItem];
    this.saleItemName = '';
    this.saleItemPrice = null;
    this.error.set('');
  }

  removeSaleItem(name: string): void {
    this.form.saleItems = (this.form.saleItems ?? []).filter(i => i.name !== name);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedImageName = file.name;
    this.uploadingImage.set(true);
    this.error.set('');

    this.eventService.uploadEventImage(file).subscribe({
      next: (url) => {
        this.uploadingImage.set(false);
        if (!url) {
          this.error.set('Falha ao enviar imagem. Tente novamente.');
          return;
        }
        this.form.imageUrl = url;
      },
      error: () => {
        this.uploadingImage.set(false);
        this.error.set('Falha ao enviar imagem. Tente novamente.');
      }
    });
  }

  submit(): void {
    if (this.uploadingImage()) {
      this.error.set('Aguarde o upload da imagem terminar.');
      return;
    }

    if (!this.form.title || !this.form.startDate || !this.form.endDate || !this.form.location || !this.form.contactPhone) {
      this.error.set('Preencha todos os campos obrigatórios.');
      return;
    }
    if (new Date(this.form.endDate) <= new Date(this.form.startDate)) {
      this.error.set('A data de fim deve ser após a data de início.');
      return;
    }
    if (this.form.isPaid && (!this.form.ticketPrice || this.form.ticketPrice <= 0)) {
      this.error.set('Informe o valor do evento pago.');
      return;
    }

    // Enforce scope → visibility / organizationId
    if (this.eventScope === 'PUBLIC') {
      this.form.visibility = 'PUBLIC';
      this.form.organizationId = null;
    } else {
      this.form.visibility = 'PRIVATE';
      if (!this.form.organizationId) {
        this.error.set(
          this.eventScope === 'ORG'
            ? 'Selecione a organização para o evento.'
            : 'Selecione a unidade para o evento.'
        );
        return;
      }
    }

    this.form.saleItems = (this.form.saleItems ?? []).map(item => ({
      ...item,
      interestedUserIds: item.interestedUserIds ?? []
    }));

    this.saving.set(true);
    this.error.set('');

    if (this.editingEventId) {
      this.eventService.updateEvent(this.editingEventId, this.form).subscribe({
        next: (evt) => this.router.navigate(['/eventos', evt.id]),
        error: () => { this.saving.set(false); this.error.set('Erro ao atualizar. Tente novamente.'); }
      });
      return;
    }

    this.eventService.createEvent(this.form).subscribe({
      next: (evt) => this.router.navigate(['/eventos', evt.id]),
      error: () => { this.saving.set(false); this.error.set('Erro ao salvar. Tente novamente.'); }
    });
  }
}
