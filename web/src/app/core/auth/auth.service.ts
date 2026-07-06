import {
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'RECEPCION' | 'MAESTRO';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private api = '/api/auth';

  private tokenKey = 'atico_access_token';
  private userKey = 'atico_user';

  user = signal<AuthUser | null>(this.getStoredUser());
  token = signal<string | null>(this.getStoredToken());

  isAuthenticated = computed(() => {
    return !!this.token() && !!this.user();
  });

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${this.api}/login`, {
      username,
      password,
    }).pipe(
      tap((response) => {
        localStorage.setItem(this.tokenKey, response.accessToken);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));

        this.token.set(response.accessToken);
        this.user.set(response.user);
      }),
    );
  }

  forgotPassword(identifier: string) {
    return this.http.post<{ message: string }>(`${this.api}/forgot-password`, {
      identifier,
    });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<{ message: string }>(`${this.api}/reset-password`, {
      token,
      password,
    });
  }

  updateMe(payload: {
    name?: string;
    username?: string;
    password?: string;
  }) {
    return this.http.patch<{ user: AuthUser }>(`${this.api}/me`, payload).pipe(
      tap((response) => {
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        this.user.set(response.user);
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);

    this.token.set(null);
    this.user.set(null);

    this.router.navigate(['/login']);
  }

  hasAnyRole(roles: UserRole[]): boolean {
    const user = this.user();

    if (!user) {
      return false;
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    return roles.includes(user.role);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(this.userKey);
      return null;
    }
  }
}
