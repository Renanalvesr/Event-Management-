import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OrganizationService } from '../../services/organization.service';
import { Organization } from '../../models/organization.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-organization-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './organization-admin.component.html',
  styleUrls: ['./organization-admin.component.scss']
})
export class OrganizationAdminComponent implements OnInit {
  rootOrg = signal<Organization | null>(null);
  units = signal<Organization[]>([]);
  familyUsers = signal<User[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal('');
  error = signal('');

  showUnitForm = false;
  unitForm = {
    name: '',
    city: '',
    state: '',
    description: ''
  };

  constructor(
    public auth: AuthService,
    private orgService: OrganizationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    const orgId = this.auth.getUserOrganizationId();
    if (!orgId) {
      this.loading.set(false);
      return;
    }

    // Determine the root org
    this.orgService.getById(orgId).subscribe(org => {
      if (!org) { this.loading.set(false); return; }

      const rootId = org.parentOrganizationId ?? org.id;

      // Load root org
      this.orgService.getById(rootId).subscribe(root => {
        this.rootOrg.set(root ?? null);

        // Load units
        this.orgService.getUnitsByParentId(rootId).subscribe(units => {
          this.units.set(units);
          this.loading.set(false);
        });
      });
    });

    // Load family users
    this.familyUsers.set(this.auth.getVisibleUsersForAdmin());
  }

  createUnit(): void {
    this.error.set('');
    this.message.set('');

    const root = this.rootOrg();
    if (!root) {
      this.error.set('Organização raiz não encontrada.');
      return;
    }

    if (!this.unitForm.name || !this.unitForm.city || !this.unitForm.state) {
      this.error.set('Preencha nome, cidade e estado da unidade.');
      return;
    }

    this.saving.set(true);
    const result = this.orgService.createUnit(root.id, {
      name: this.unitForm.name,
      city: this.unitForm.city,
      state: this.unitForm.state,
      description: this.unitForm.description
    });
    this.saving.set(false);

    if (!result.success) {
      this.error.set(result.message);
      return;
    }

    this.message.set(result.message + ` Código: ${result.organization?.joinCode}`);
    this.unitForm = { name: '', city: '', state: '', description: '' };
    this.showUnitForm = false;

    // Reload units
    const rootId = this.rootOrg()!.id;
    this.orgService.getUnitsByParentId(rootId).subscribe(units => this.units.set(units));
  }

  cancelUnitForm(): void {
    this.showUnitForm = false;
    this.unitForm = { name: '', city: '', state: '', description: '' };
    this.error.set('');
  }

  usersOfOrg(orgId: number): User[] {
    return this.familyUsers().filter(u => u.organizationId === orgId);
  }

  roleLabel(role: string): string {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'MEMBER') return 'Membro';
    return 'Usuário';
  }

  orgLabel(org: Organization): string {
    return org.parentOrganizationId ? `Unidade • ${org.city}, ${org.state}` : `Sede • ${org.city}, ${org.state}`;
  }
}

