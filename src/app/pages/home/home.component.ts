import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../../services/organization.service';
import { Organization } from '../../models/organization.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private readonly defaultHeroImage = 'assets/backgrounds/Capoeira_Bonfim.jpg';
  private organizationHeroImageFailed = false;
  private organizationHeroImageLoaded = false;

  userOrg: Organization | undefined;
  organizationsLoaded = false;
  joinCode = '';
  newOrgName = '';
  newOrgCity = '';
  newOrgState = '';
  orgSetupError = '';

  readonly featuredEventsImage = 'assets/backgrounds/eventos.png';

  constructor(
    public auth: AuthService,
    private orgService: OrganizationService
  ) {}

  ngOnInit(): void {
    const orgId = this.currentOrganizationId;
    this.userOrg = orgId !== null ? this.orgService.getByIdSync(orgId) : undefined;
    this.refreshOrganizations();
  }

  joinOrganization(): void {
    this.orgSetupError = '';
    const result = this.auth.joinOrganization(this.joinCode);
    if (!result.success) { this.orgSetupError = result.message; return; }
    this.joinCode = '';
    this.refreshOrganizations();
  }

  createOrganization(): void {
    this.orgSetupError = '';
    const createResult = this.orgService.createOrganization({
      name: this.newOrgName, city: this.newOrgCity,
      state: this.newOrgState
    });
    if (!createResult.success || !createResult.organization) {
      this.orgSetupError = createResult.message; return;
    }
    const assignResult = this.auth.assignCurrentUserToOrganization(createResult.organization.id, 'SUPER_ADMIN');
    if (!assignResult.success) { this.orgSetupError = assignResult.message; return; }
    this.newOrgName = ''; this.newOrgCity = ''; this.newOrgState = '';
    this.refreshOrganizations();
  }

  get heroBackgroundImage(): string {
    const imageUrl = this.showOrganizationHero
      ? this.heroOrganizationLogo
      : this.defaultHeroImage;

    return `url('${imageUrl}')`;
  }

  get showOrganizationHero(): boolean {
    return this.hasOrganizationMembership
      && !!this.userOrg?.logoUrl?.trim()
      && this.organizationHeroImageLoaded
      && !this.organizationHeroImageFailed;
  }

  get showDefaultHero(): boolean {
    return !this.showOrganizationHero;
  }

  get heroOrganizationName(): string {
    return this.userOrg?.name ?? '';
  }

  get heroOrganizationLogo(): string {
    if (!this.userOrg) return this.defaultHeroImage;
    return this.userOrg.logoUrl ?? '';
  }

  get showOrganizationNameOnlyHero(): boolean {
    return false;
  }

  onOrganizationHeroImageError(): void {
    this.organizationHeroImageLoaded = false;
    this.organizationHeroImageFailed = true;
  }

  onOrganizationHeroImageLoad(): void {
    this.organizationHeroImageLoaded = true;
    this.organizationHeroImageFailed = false;
  }

  get hasOrganizationMembership(): boolean {
    return this.auth.isLoggedIn() && this.currentOrganizationId !== null;
  }

  get heroOrganizationLocation(): string {
    if (!this.userOrg) return '';
    return `${this.userOrg.city}, ${this.userOrg.state}`;
  }

  private refreshOrganizations(): void {
    this.organizationsLoaded = false;
    this.orgService.getOrganizations().subscribe(orgs => {
      const orgId = this.currentOrganizationId;
      this.userOrg = orgId !== null
        ? orgs.find(o => Number(o.id) === orgId)
        : undefined;
      this.organizationHeroImageLoaded = false;
      this.organizationHeroImageFailed = false;
      this.organizationsLoaded = true;
    });
  }

  private get currentOrganizationId(): number | null {
    return this.normalizeOrganizationId(this.auth.getUserOrganizationId());
  }

  private normalizeOrganizationId(value: number | null): number | null {
    if (value === null || value === undefined) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }
}
