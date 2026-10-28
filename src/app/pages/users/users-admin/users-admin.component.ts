import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { OrganizationService } from '../../../services/organization.service';
import { Organization } from '../../../models/organization.model';
import { User, UserRole } from '../../../models/user.model';

@Component({
  selector: 'app-users-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-admin.component.html',
  styleUrls: ['./users-admin.component.scss']
})
export class UsersAdminComponent implements OnInit {
  users = signal<User[]>([]);
  organizations: Organization[] = [];
  loading = signal(true);
  saving = signal(false);
  message = signal('');
  error = signal('');
  editingUserId = signal<number | null>(null);
  editActive = true;

  form: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    organizationId: number | null;
  } = {
    name: '',
    email: '',
    password: '',
    role: 'USER',
    organizationId: null
  };

  constructor(
    public auth: AuthService,
    public orgService: OrganizationService
  ) {}

  refreshUsers(): void {
    this.users.set(this.auth.getVisibleUsersForAdmin());
  }

  submit(): void {
    if (this.editingUserId() !== null) {
      this.updateUser();
      return;
    }
    if (!this.form.name || !this.form.email || !this.form.password) {
      this.error.set('Preencha nome, e-mail e senha.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    const result = this.auth.createUserByAdmin(this.form);
    this.saving.set(false);
    if (!result.success) { this.error.set(result.message); return; }
    this.message.set(result.message);
    this.form = {
      name: '', email: '', password: '',
      role: 'MEMBER',
      organizationId: this.auth.isSuperAdmin() ? null : this.auth.getUserOrganizationId()
    };
    this.refreshUsers();
  }

  startEdit(user: User): void {
    if (!this.auth.isSuperAdmin()) return;

    this.editingUserId.set(user.id);
    this.editActive = user.active;
    this.form = {
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      organizationId: user.organizationId
    };
    this.error.set('');
    this.message.set('');
  }

  cancelEdit(): void {
    this.editingUserId.set(null);
    this.editActive = true;
    this.form = {
      name: '',
      email: '',
      password: '',
      role: this.auth.isSuperAdmin() ? 'USER' : 'MEMBER',
      organizationId: this.auth.isSuperAdmin() ? null : this.auth.getUserOrganizationId()
    };
    this.error.set('');
    this.message.set('');
  }

  private updateUser(): void {
    if (!this.auth.isSuperAdmin()) {
      this.error.set('Apenas super admin pode editar usuários.');
      return;
    }
    const targetId = this.editingUserId();
    if (targetId === null) return;
    if (!this.form.name || !this.form.email) {
      this.error.set('Preencha nome e e-mail para editar.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.message.set('');
    const result = this.auth.updateUserBySuperAdmin(targetId, {
      name: this.form.name, email: this.form.email,
      role: this.form.role, organizationId: this.form.organizationId,
      active: this.editActive
    });
    this.saving.set(false);
    if (!result.success) { this.error.set(result.message); return; }
    const successMessage = result.message;
    this.cancelEdit();
    this.message.set(successMessage);
    this.refreshUsers();
  }

  ngOnInit(): void {
    this.form = {
      ...this.form,
      role: this.auth.isSuperAdmin() ? 'MEMBER' : 'MEMBER',
      organizationId: this.auth.isSuperAdmin() ? null : this.auth.getUserOrganizationId()
    };

    this.refreshUsers();
    this.orgService.getOrganizations().subscribe(orgs => {
      // Org SUPER_ADMIN sees only their family orgs; platform SUPER_ADMIN sees all
      if (this.auth.isOrgSuperAdmin()) {
        const orgId = this.auth.getUserOrganizationId();
        if (orgId) {
          const familyIds = this.orgService.getOrganizationFamilySync(orgId);
          this.organizations = orgs.filter(o => familyIds.includes(o.id));
        }
      } else {
        this.organizations = orgs;
      }
    });
    this.loading.set(false);
  }

  canCreateAdmin(): boolean {
    return this.auth.isSuperAdmin();
  }

  /** Org SUPER_ADMIN can create ADMINs; platform SUPER_ADMIN can create any role */
  canCreateOrgAdmin(): boolean {
    return this.auth.isOrgSuperAdmin();
  }

  logout(): void {
    this.auth.logout();
  }

  roleLabel(role: UserRole): string {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'MEMBER') return 'Membro';
    return 'Usuário';
  }
}
