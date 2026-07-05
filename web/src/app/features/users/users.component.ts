import {
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  AuthService,
  UserRole,
} from '../../core/auth/auth.service';
import {
  AdminUser,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  UsersService,
} from '../../core/services/users.service';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private usersService = inject(UsersService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  users = signal<AdminUser[]>([]);
  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingUser = signal<AdminUser | null>(null);
  alert = signal<UiAlert | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.email]],
    password: ['', [Validators.minLength(8)]],
    role: ['RECEPCION' as UserRole, Validators.required],
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);

    this.usersService.getAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error) => {
        console.error(error);
        this.loading.set(false);
        this.setAlert('error', this.getApiErrorMessage(error, 'No se pudieron cargar los usuarios.'));
      },
    });
  }

  openCreateForm(): void {
    this.editingUser.set(null);
    this.clearAlert();
    this.form.reset({
      name: '',
      username: '',
      email: '',
      password: '',
      role: this.getAvailableRoles()[0],
    });
    this.form.get('role')?.enable({ emitEvent: false });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.get('password')?.updateValueAndValidity({ emitEvent: false });
    this.showForm.set(true);
  }

  openEditForm(user: AdminUser): void {
    if (!this.canEditUser(user)) {
      return;
    }

    this.editingUser.set(user);
    this.clearAlert();
    this.form.reset({
      name: user.name,
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
    });
    this.form.get('password')?.setValidators([Validators.minLength(8)]);
    this.form.get('password')?.updateValueAndValidity({ emitEvent: false });

    if (this.auth.user()?.role === 'ADMIN') {
      this.form.get('role')?.disable({ emitEvent: false });
    } else {
      this.form.get('role')?.enable({ emitEvent: false });
    }

    this.showForm.set(true);
  }

  closeForm(): void {
    if (this.saving()) {
      return;
    }

    this.showForm.set(false);
    this.editingUser.set(null);
    this.form.get('role')?.enable({ emitEvent: false });
    this.form.get('password')?.setValidators([Validators.minLength(8)]);
    this.form.get('password')?.updateValueAndValidity({ emitEvent: false });
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setAlert('warning', 'Completa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    const role = (raw.role || 'RECEPCION') as UserRole;

    if (!this.canUseRole(role)) {
      this.setAlert('error', 'No tienes permisos para crear este tipo de usuario.');
      return;
    }

    const editing = this.editingUser();
    const password = String(raw.password || '').trim();

    this.saving.set(true);
    this.clearAlert();

    const request = editing
      ? this.usersService.update(editing.id, this.buildUpdatePayload(raw, password))
      : this.usersService.create({
          name: String(raw.name || '').trim(),
          username: String(raw.username || '').trim(),
          email: String(raw.email || '').trim() || null,
          password,
          role,
        } satisfies CreateAdminUserPayload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadUsers();
        this.setAlert('success', editing ? 'Usuario actualizado correctamente.' : 'Usuario creado correctamente.');
      },
      error: (error) => {
        console.error(error);
        this.saving.set(false);
        this.setAlert('error', this.getApiErrorMessage(error, 'No se pudo guardar el usuario.'));
      },
    });
  }

  deleteUser(user: AdminUser): void {
    if (!this.canDeleteUser(user)) {
      return;
    }

    const confirmed = confirm(`¿Eliminar el usuario ${user.name}?`);

    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.clearAlert();

    this.usersService.delete(user.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.loadUsers();
        this.setAlert('success', 'Usuario eliminado correctamente.');
      },
      error: (error) => {
        console.error(error);
        this.saving.set(false);
        this.setAlert('error', this.getApiErrorMessage(error, 'No se pudo eliminar el usuario.'));
      },
    });
  }

  getAvailableRoles(): UserRole[] {
    if (this.auth.user()?.role === 'SUPER_ADMIN') {
      return ['SUPER_ADMIN', 'ADMIN', 'RECEPCION', 'MAESTRO'];
    }

    return ['RECEPCION'];
  }

  canCreateUsers(): boolean {
    return this.auth.hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  }

  canEditUser(user: AdminUser): boolean {
    const currentRole = this.auth.user()?.role;

    if (currentRole === 'SUPER_ADMIN') {
      return true;
    }

    return currentRole === 'ADMIN' && user.role === 'RECEPCION';
  }

  canDeleteUser(user: AdminUser): boolean {
    if (this.auth.user()?.id === user.id) {
      return false;
    }

    return this.canEditUser(user);
  }

  getRoleLabel(role: UserRole): string {
    if (role === 'SUPER_ADMIN') return 'Dirección';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'RECEPCION') return 'Recepción';
    return 'Docente';
  }

  getRoleClass(role: UserRole): string {
    if (role === 'MAESTRO') return 'docente';

    return role.toLowerCase().replace('_', '-');
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  private buildUpdatePayload(raw: any, password: string): UpdateAdminUserPayload {
    const payload: UpdateAdminUserPayload = {
      name: String(raw.name || '').trim(),
      username: String(raw.username || '').trim(),
      email: String(raw.email || '').trim() || null,
    };

    if (this.auth.user()?.role === 'SUPER_ADMIN') {
      payload.role = (raw.role || 'RECEPCION') as UserRole;
    }

    if (password) {
      payload.password = password;
    }

    return payload;
  }

  private canUseRole(role: UserRole): boolean {
    return this.getAvailableRoles().includes(role);
  }

  private setAlert(type: AlertType, message: string): void {
    this.alert.set({ type, message });
  }

  private clearAlert(): void {
    this.alert.set(null);
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message || error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return typeof message === 'string' && message.trim()
      ? message
      : fallback;
  }
}
