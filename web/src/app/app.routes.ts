import { Routes } from '@angular/router';
import { LayoutComponent } from './core/layout/layout.component';

import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },

  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          )
      },

      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
        canActivate: [authGuard]
      },

      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then((m) => m.UsersComponent),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'help',
        loadComponent: () =>
          import('./features/help/help.component').then(
            (m) => m.HelpComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        path: 'students',
        loadComponent: () =>
          import('./features/students/students.component').then(
            (m) => m.StudentsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'students/new',
        loadComponent: () =>
          import('./features/student-form/student-form.component').then(
            (m) => m.StudentFormComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'students/:id/edit',
        loadComponent: () =>
          import('./features/student-form/student-form.component').then(
            (m) => m.StudentFormComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'students/:id',
        loadComponent: () =>
          import('./features/student-detail/student-detail.component').then(
            (m) => m.StudentDetailComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'teachers',
        loadComponent: () =>
          import('./features/teachers/teachers.component').then(
            (m) => m.TeachersComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'classes',
        loadComponent: () =>
          import('./features/classes/classes.component').then(
            (m) => m.ClassesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        path: 'check-in',
        loadComponent: () =>
          import('./features/check-in/check-in.component').then(
            (m) => m.CheckInComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        // Módulo protegido y fuera del menú principal hasta completar su flujo operativo.
        path: 'courses',
        loadComponent: () =>
          import('./features/courses/courses.component').then(
            (m) => m.CoursesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'rooms',
        loadComponent: () =>
          import('./features/rooms/rooms.component').then((m) => m.RoomsComponent),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'rentals',
        loadComponent: () =>
          import('./features/rentals/rentals.component').then(
            (m) => m.RentalsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'reservations',
        loadComponent: () =>
          import('./features/reservations/reservations.component').then(
            (m) => m.ReservationsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'attendances',
        loadComponent: () =>
          import('./features/attendances/attendances.component').then(
            (m) => m.AttendancesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        path: 'memberships',
        loadComponent: () =>
          import('./features/memberships/memberships.component').then(
            (m) => m.MembershipsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'packages',
        loadComponent: () =>
          import('./features/packages/packages.component').then(
            (m) => m.PackagesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'finances',
        loadComponent: () =>
          import('./features/finances/finances.component').then(
            (m) => m.FinancesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'teacher-payments',
        loadComponent: () =>
          import('./features/teacher-payments/teacher-payments.component').then(
            (m) => m.TeacherPaymentsComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/expenses.component').then(
            (m) => m.ExpensesComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'calendar',
        loadComponent: () =>
          import('./features/calendar/calendar.component').then(
            (m) => m.CalendarComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        path: 'pos',
        loadComponent: () =>
          import('./features/pos/pos.component').then((m) => m.PosComponent),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'cash-cut',
        loadComponent: () =>
          import('./features/cash-cut/cash-cut.component').then(
            (m) => m.CashCutComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'store',
        loadComponent: () =>
          import('./features/store/store.component').then((m) => m.StoreComponent),
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      }

    ]
  },

  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
