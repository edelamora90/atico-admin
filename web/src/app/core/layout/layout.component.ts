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
import { ThemeService } from '../services/theme.service';

interface MenuItem {
  label: string;
  path: string;
  roles: UserRole[];
}

interface MenuSection {
  label: string;
  items: MenuItem[];
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
  theme = inject(ThemeService);

  menuSections: MenuSection[] = [
    {
      label: 'Inicio',
      items: [
        {
          label: 'Dashboard',
          path: '/dashboard',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
        },
      ],
    },
    {
      label: 'Operación académica',
      items: [
        {
          label: 'Calendario',
          path: '/calendar',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
        },
        {
          label: 'Programación',
          path: '/classes',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
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
          label: 'Check-in',
          path: '/check-in',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
        },
      ],
    },
    {
      label: 'Alumnos',
      items: [
        {
          label: 'Alumnos',
          path: '/students',
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
      ],
    },
    {
      label: 'Personal',
      items: [
        {
          label: 'Maestros',
          path: '/teachers',
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Pagos a maestros',
          path: '/teacher-payments',
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Usuarios / Admin',
          path: '/users',
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
      ],
    },
    {
      label: 'Finanzas',
      items: [
        {
          label: 'Finanzas',
          path: '/finances',
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Gastos',
          path: '/expenses',
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
        {
          label: 'Corte de caja',
          path: '/cash-cut',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
        },
      ],
    },
    {
      label: 'Rentas y espacios',
      items: [
        {
          label: 'Rentas',
          path: '/rentals',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
        },
        {
          label: 'Salones',
          path: '/rooms',
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
      ],
    },
    {
      label: 'Tienda / POS',
      items: [
        {
          label: 'Tienda',
          path: '/store',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
        },
        {
          label: 'POS',
          path: '/pos',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'],
        },
      ],
    },
    {
      label: 'Configuración',
      items: [
        {
          label: 'Negocio',
          path: '/settings',
          roles: ['SUPER_ADMIN', 'ADMIN'],
        },
      ],
    },
    {
      label: 'Soporte',
      items: [
        {
          label: 'Ayuda',
          path: '/help',
          roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'],
        },
      ],
    },
  ];

  canSee(item: MenuItem): boolean {
    return this.auth.hasAnyRole(item.roles);
  }

  getVisibleItems(section: MenuSection): MenuItem[] {
    return section.items.filter((item) => this.canSee(item));
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
