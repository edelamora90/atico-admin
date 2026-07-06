import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CreateMembershipPayload {
  studentId: string;
  packageId: string;
}

@Injectable({
  providedIn: 'root'
})
export class MembershipsService {

  private http = inject(HttpClient);

  private api =
    '/api/memberships';

  getAll() {
    return this.http.get<any[]>(this.api);
  }

  create(payload: CreateMembershipPayload) {
    return this.http.post<any>(this.api, payload);
  }

  cancel(id: string, reason: string) {
    return this.http.patch<any>(`${this.api}/${id}/cancel`, {
      reason
    });
  }
}
