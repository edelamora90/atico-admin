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

import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    username: ['edelamora', Validators.required],
    password: ['', Validators.required],
  });

  login(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Captura usuario y contraseña.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const value = this.form.value;

    this.auth.login(
      value.username || '',
      value.password || '',
    ).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);

        const message = err?.error?.message;

        if (Array.isArray(message)) {
          this.errorMessage.set(message.join(' '));
          return;
        }

        this.errorMessage.set(message || 'No se pudo iniciar sesión.');
      },
    });
  }
}
