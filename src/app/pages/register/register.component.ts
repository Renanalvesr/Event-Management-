import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  /** 'join' = entrar com código  |  'create' = criar nova organização  |  'none' = só criar conta */
  mode: 'join' | 'create' | 'none' = 'none';

  // Join mode
  joinCode = '';

  // Create org mode
  orgName = '';
  orgCity = '';
  orgState = '';
  orgDescription = '';

  loading = signal(false);
  error = signal('');
  successMessage = signal('');

  constructor(
    private auth: AuthService,
    private router: Router
  ) {}

  submit(): void {
    if (!this.name || !this.email || !this.password) {
      this.error.set('Preencha os campos obrigatórios.');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error.set('As senhas não coincidem.');
      return;
    }
    if (this.mode === 'create' && (!this.orgName || !this.orgCity || !this.orgState)) {
      this.error.set('Preencha nome, cidade e estado da organização.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    setTimeout(() => {
      const createOrgPayload = this.mode === 'create'
        ? { name: this.orgName, city: this.orgCity, state: this.orgState, description: this.orgDescription }
        : undefined;

      const result = this.auth.register(
        this.name, this.email, this.password,
        this.mode === 'join' ? this.joinCode : '',
        createOrgPayload
      );
      this.loading.set(false);

      if (!result.success) {
        this.error.set(result.message);
        return;
      }

      if (this.mode === 'create') {
        this.successMessage.set(result.message);
        setTimeout(() => this.router.navigate(['/organizacao']), 3000);
        return;
      }

      this.router.navigate(['/eventos']);
    }, 250);
  }
}
