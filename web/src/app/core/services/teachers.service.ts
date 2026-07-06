import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Teacher {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  classes?: any[];
}

export interface TeacherPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TeachersService {

  private http = inject(HttpClient);

  private api = '/api/teachers';

  getAll() {
    return this.http.get<Teacher[]>(this.api);
  }

  getById(id: string) {
    return this.http.get<Teacher>(`${this.api}/${id}`);
  }

  create(payload: TeacherPayload) {
    return this.http.post<Teacher>(this.api, payload);
  }

  update(id: string, payload: TeacherPayload) {
    return this.http.patch<Teacher>(`${this.api}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
