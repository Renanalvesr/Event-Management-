import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface QuickLoginProfile {
  label: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');
  readonly quickLogins: QuickLoginProfile[] = [
    { label: 'Ricardo', email: 'ricardo@capoeira.com', password: 'user123' },
    { label: 'Bonfim', email: 'bonfim@capoeira.com', password: 'admin123' },
    { label: 'SuperAdmin', email: 'superadmin@capoeira.com', password: 'super123' },
    { label: 'Renan', email: 'renan@capoeira.com', password: 'user123' }
  ];

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit(): void {
    if (!this.email || !this.password) {
      this.error.set('Preencha e-mail e senha.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    setTimeout(() => {
      const result = this.auth.login(this.email, this.password);
      this.loading.set(false);

      if (!result.success) {
        this.error.set(result.message);
        return;
      }

      this.router.navigate(['/eventos']);
    }, 250);
  }

  quickLogin(profile: QuickLoginProfile): void {
    if (this.loading()) return;
    this.email = profile.email;
    this.password = profile.password;
    this.submit();
  }
}
