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
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = signal(false);
  message = signal('');
  errorMessage = signal('');

  form = this.fb.group({
    identifier: ['', Validators.required],
  });

  submit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Captura tu usuario o correo.');
      return;
    }

    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.auth.forgotPassword(this.form.value.identifier || '').subscribe({
      next: (response) => {
        this.loading.set(false);
        this.message.set(response.message);
      },
      error: (error) => {
        console.error(error);
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'No se pudo enviar la recuperación.');
      },
    });
  }
}
