import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

import {
  AuthService,
  UserRole,
} from '../auth/auth.service';

interface MenuItem {
  label: string;
  path: string;
  roles: UserRole[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  auth = inject(AuthService);

  menuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
    },
    {
      label: 'Alumnos',
      path: '/students',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
    {
      label: 'Usuarios',
      path: '/users',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'Configuración',
      path: '/settings',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'Docentes',
      path: '/teachers',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'Clases',
      path: '/classes',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
    },
    {
      label: 'Check-in',
      path: '/check-in',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
    },
    {
      label: 'Salones',
      path: '/rooms',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'Rentas',
      path: '/rentals',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
    {
      label: 'Reservaciones',
      path: '/reservations',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
    {
      label: 'Asistencias',
      path: '/attendances',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
    },
    {
      label: 'Caja / POS',
      path: '/pos',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
    {
      label: 'Corte de caja',
      path: '/cash-cut',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
    {
      label: 'Membresías',
      path: '/memberships',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
    {
      label: 'Paquetes',
      path: '/packages',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
    {
      label: 'Finanzas',
      path: '/finances',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'Corte docente',
      path: '/teacher-payments',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'Gastos',
      path: '/expenses',
      roles: ['SUPER_ADMIN', 'ADMIN'],
    },
    {
      label: 'Calendario',
      path: '/calendar',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
    },
    {
      label: 'Tienda',
      path: '/store',
      roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
    },
  ];

  canSee(item: MenuItem): boolean {
    return this.auth.hasAnyRole(item.roles);
  }

  logout(): void {
    this.auth.logout();
  }

  getRoleLabel(role?: UserRole): string {
    if (role === 'SUPER_ADMIN') return 'Dirección';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'RECEPCION') return 'Recepción';
    if (role === 'MAESTRO') return 'Docente';

    return 'Usuario';
  }
}
