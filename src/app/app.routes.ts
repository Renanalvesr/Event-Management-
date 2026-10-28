import { Routes } from '@angular/router';
import { authGuard, adminGuard, superAdminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'eventos',
    loadComponent: () => import('./pages/events/events-list/events-list.component').then(m => m.EventsListComponent)
  },
  {
    path: 'eventos/novo',
    loadComponent: () => import('./pages/events/event-form/event-form.component').then(m => m.EventFormComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'eventos/:id',
    loadComponent: () => import('./pages/events/event-detail/event-detail.component').then(m => m.EventDetailComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/users/users-admin/users-admin.component').then(m => m.UsersAdminComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'organizacao',
    loadComponent: () => import('./pages/organization/organization-admin.component').then(m => m.OrganizationAdminComponent),
    canActivate: [superAdminGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
