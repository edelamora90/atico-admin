import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AticoPackage {
  id: string;
  name: string;
  price: number;
  credits: number;
  teacherPercentage: number;
  atticPercentage?: number;
  teacherPaymentPerClass?: number;
  type?: 'PACKAGE' | 'PROMOTION' | 'TRIAL' | 'DAY_PASS';
  area?: 'DANCE' | 'MUSIC' | 'BOTH';
  requiresEnrollment?: boolean;
  includesFreeInscription?: boolean;
  isTrial?: boolean;
  memberships?: any[];
  createdAt?: string;
}

export interface PackagePayload {
  name: string;
  price: number;
  credits: number;
  teacherPercentage: number;
  atticPercentage?: number;
  teacherPaymentPerClass?: number;
  type?: 'PACKAGE' | 'PROMOTION' | 'TRIAL' | 'DAY_PASS';
  area?: 'DANCE' | 'MUSIC';
  requiresEnrollment?: boolean;
  includesFreeInscription?: boolean;
  isTrial?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PackagesService {

  private http = inject(HttpClient);

  private api =
    '/api/packages';

  getAll() {
    return this.http.get<AticoPackage[]>(this.api);
  }

  create(payload: PackagePayload) {
    return this.http.post<AticoPackage>(this.api, payload);
  }

  update(id: string, payload: PackagePayload) {
    return this.http.patch<AticoPackage>(`${this.api}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
