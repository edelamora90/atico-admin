import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;

  birthDate: string | null;
  bloodType: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  injuries: string | null;
  medicalNotes: string | null;

  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactPhone2: string | null;

  photoConsent: boolean;
  mediaConsent: boolean;
  rulesAccepted: boolean;

  status: string;
  trialClassUsed: boolean;
  trialClassPaid: boolean;
  trialClassAmount: number;
  inscriptionAmount: number;
  inscriptionPaid: boolean;
  academicArea: 'DANCE' | 'MUSIC' | 'BOTH';
  enrolled: boolean;
  enrollmentExpiresAt: string | null;

  memberships: any[];
  payments: any[];
  reservations: any[];
  attendances?: any[];
  posSales?: any[];
  studentContinuity?: StudentContinuity | null;

  createdAt: string;
  updatedAt: string;
}

export type ContinuityStatus =
  | 'ACTIVE'
  | 'GRACE_PERIOD'
  | 'EXPIRED_NEEDS_RENEWAL'
  | 'NEW_NEEDS_INSCRIPTION'
  | 'INSCRIBED_NO_MEMBERSHIP';

export interface StudentContinuity {
  hasEverPaidInscription: boolean;
  isCurrentlyEnrolled: boolean;
  requiresInitialInscription: boolean;
  requiresRenewal: boolean;
  renewalFeeAmount: number;
  graceUntil: string | null;
  continuityStatus: ContinuityStatus;
  reason: string;
}

export interface CreateStudentPayload {
  name: string;
  email?: string | null;
  phone?: string | null;

  birthDate?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  medicalConditions?: string | null;
  medications?: string | null;
  injuries?: string | null;
  medicalNotes?: string | null;

  emergencyContactName?: string | null;
  emergencyContactRelationship?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactPhone2?: string | null;

  academicArea?: 'DANCE' | 'MUSIC' | 'BOTH';
  photoConsent?: boolean;
  mediaConsent?: boolean;
  rulesAccepted?: boolean;
}

export type StudentProfilePayload = CreateStudentPayload;

@Injectable({
  providedIn: 'root'
})
export class StudentsService {

  private http = inject(HttpClient);

  private api =
    '/api/students';

  getAll() {
    return this.http.get<Student[]>(this.api);
  }

  getById(id: string) {
    return this.http.get<Student>(`${this.api}/${id}`);
  }

  create(payload: CreateStudentPayload) {
    return this.http.post<Student>(this.api, payload);
  }

  update(id: string, payload: StudentProfilePayload) {
    return this.http.patch<Student>(`${this.api}/${id}`, payload);
  }

  payInscription(id: string) {
    return this.http.patch<Student>(`${this.api}/${id}/pay-inscription`, {});
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
