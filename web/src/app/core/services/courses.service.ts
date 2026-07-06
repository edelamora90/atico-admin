import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Course {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
}

export interface CoursePayload {
  name: string;
  description?: string | null;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CoursesService {
  private http = inject(HttpClient);
  private api = '/api/courses';

  getAll() {
    return this.http.get<Course[]>(this.api);
  }

  create(payload: CoursePayload) {
    return this.http.post<Course>(this.api, payload);
  }

  update(id: string, payload: CoursePayload) {
    return this.http.patch<Course>(`${this.api}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
