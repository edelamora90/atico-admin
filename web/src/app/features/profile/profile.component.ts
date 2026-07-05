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

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  saving = signal(false);
  message = signal('');
  errorMessage = signal('');

  form = this.fb.group({
    name: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.minLength(8)]],
    confirmPassword: [''],
  });

  ngOnInit(): void {
    const user = this.auth.user();

    this.form.reset({
      name: user?.name || '',
      username: user?.username || '',
      password: '',
      confirmPassword: '',
    });
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Completa nombre y usuario.');
      return;
    }

    const raw = this.form.getRawValue();
    const password = String(raw.password || '').trim();
    const confirmPassword = String(raw.confirmPassword || '').trim();

    if (password && password !== confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.saving.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.auth.updateMe({
      name: String(raw.name || '').trim(),
      username: String(raw.username || '').trim(),
      ...(password ? { password } : {}),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Perfil actualizado correctamente.');
        this.form.patchValue({
          password: '',
          confirmPassword: '',
        });
      },
      error: (error) => {
        console.error(error);
        this.saving.set(false);
        this.errorMessage.set(error?.error?.message || 'No se pudo actualizar el perfil.');
      },
    });
  }

  getRoleLabel(): string {
    const role = this.auth.user()?.role;

    if (role === 'SUPER_ADMIN') return 'Dirección';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'RECEPCION') return 'Recepción';
    if (role === 'MAESTRO') return 'Docente';

    return 'Usuario';
  }
}
