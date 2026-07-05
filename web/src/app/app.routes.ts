import { Routes } from '@angular/router';
import { LayoutComponent } from './core/layout/layout.component';

import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

import { LoginComponent } from './features/login/login.component';
import { ForgotPasswordComponent } from './features/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './features/reset-password/reset-password.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ProfileComponent } from './features/profile/profile.component';
import { StudentsComponent } from './features/students/students.component';
import { StudentDetailComponent } from './features/student-detail/student-detail.component';
import { StudentFormComponent } from './features/student-form/student-form.component';
import { TeachersComponent } from './features/teachers/teachers.component';
import { ClassesComponent } from './features/classes/classes.component';
import { CoursesComponent } from './features/courses/courses.component';
import { RoomsComponent } from './features/rooms/rooms.component';
import { RentalsComponent } from './features/rentals/rentals.component';
import { ReservationsComponent } from './features/reservations/reservations.component';
import { AttendancesComponent } from './features/attendances/attendances.component';
import { MembershipsComponent } from './features/memberships/memberships.component';
import { PackagesComponent } from './features/packages/packages.component';
import { FinancesComponent } from './features/finances/finances.component';
import { ExpensesComponent } from './features/expenses/expenses.component';
import { CalendarComponent } from './features/calendar/calendar.component';
import { StoreComponent } from './features/store/store.component';
import { PosComponent } from './features/pos/pos.component';
import { CashCutComponent } from './features/cash-cut/cash-cut.component';
import { CheckInComponent } from './features/check-in/check-in.component';
import { UsersComponent } from './features/users/users.component';
import { TeacherPaymentsComponent } from './features/teacher-payments/teacher-payments.component';
import { SettingsComponent } from './features/settings/settings.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },

  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
  },

  {
    path: 'reset-password',
    component: ResetPasswordComponent,
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
        component: DashboardComponent
      },

      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [authGuard]
      },

      {
        path: 'users',
        component: UsersComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'students',
        component: StudentsComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'students/new',
        component: StudentFormComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'students/:id/edit',
        component: StudentFormComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'students/:id',
        component: StudentDetailComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'teachers',
        component: TeachersComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'classes',
        component: ClassesComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        path: 'check-in',
        component: CheckInComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        // Módulo protegido y fuera del menú principal hasta completar su flujo operativo.
        path: 'courses',
        component: CoursesComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'rooms',
        component: RoomsComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'rentals',
        component: RentalsComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'reservations',
        component: ReservationsComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'attendances',
        component: AttendancesComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        path: 'memberships',
        component: MembershipsComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'packages',
        component: PackagesComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'finances',
        component: FinancesComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'teacher-payments',
        component: TeacherPaymentsComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'expenses',
        component: ExpensesComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN'] }
      },

      {
        path: 'calendar',
        component: CalendarComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'] }
      },

      {
        path: 'pos',
        component: PosComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'cash-cut',
        component: CashCutComponent,
        canActivate: [roleGuard],
        data: { roles: ['SUPER_ADMIN', 'ADMIN', 'RECEPCION'] }
      },

      {
        path: 'store',
        component: StoreComponent,
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
