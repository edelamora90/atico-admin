import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { UserRole } from '../auth/auth.service';

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserPayload {
  name: string;
  username: string;
  email?: string | null;
  password: string;
  role: UserRole;
}

export interface UpdateAdminUserPayload {
  name?: string;
  username?: string;
  email?: string | null;
  password?: string;
  role?: UserRole;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private http = inject(HttpClient);
  private api = 'http://localhost:3004/api/administrators';

  getAll() {
    return this.http.get<AdminUser[]>(this.api);
  }

  getById(id: string) {
    return this.http.get<AdminUser>(`${this.api}/${id}`);
  }

  create(payload: CreateAdminUserPayload) {
    return this.http.post<AdminUser>(this.api, payload);
  }

  update(id: string, payload: UpdateAdminUserPayload) {
    return this.http.patch<AdminUser>(`${this.api}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<AdminUser>(`${this.api}/${id}`);
  }
}
