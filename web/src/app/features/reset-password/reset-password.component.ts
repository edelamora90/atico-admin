import {
  Component,
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
  ActivatedRoute,
  RouterLink,
} from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  loading = signal(false);
  message = signal('');
  errorMessage = signal('');

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  });

  submit(): void {
    if (this.loading()) {
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!token) {
      this.errorMessage.set('El enlace de recuperación no es válido.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Captura una contraseña de al menos 8 caracteres.');
      return;
    }

    const password = this.form.value.password || '';
    const confirmPassword = this.form.value.confirmPassword || '';

    if (password !== confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.auth.resetPassword(token, password).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.message.set(response.message);
        this.form.reset();
      },
      error: (error) => {
        console.error(error);
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'No se pudo cambiar la contraseña.');
      },
    });
  }
}
