import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CreateClassPayload {
  type: 'CLASS' | 'COURSE' | 'WORKSHOP' | 'RENTAL';
  area: 'DANCE' | 'MUSIC';
  title: string;
  teacherId?: string | null;
  roomId: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  capacity: number;
  teacherPaymentAmount: number;
  rentalItems?: any;
  rentalItemIds?: string[];
}

export type UpdateClassPayload = Partial<CreateClassPayload>;

export interface AticoClass {
  id: string;
  title: string;
  type: 'CLASS' | 'COURSE' | 'WORKSHOP' | 'RENTAL';
  area: 'DANCE' | 'MUSIC' | 'BOTH';
  startDate: string;
  endDate: string | null;
  durationMinutes: number;
  capacity: number;
  teacherPaymentAmount: number;
  teacherPaymentTotal?: number;
  paidAttendancesCount?: number;
  teacherPaymentSummary?: {
    total: number;
    attendancesCount: number;
    items: Array<{
      studentId: string;
      studentName: string;
      packageName: string;
      packageArea: 'DANCE' | 'MUSIC' | 'BOTH' | null;
      teacherPayment: number;
    }>;
  };
  rentalItems?: any;

  course?: any;
  teacher?: any;
  room?: any;
  reservations: any[];
  attendances: any[];
}

export interface ClassCheckInResponse {
  success: boolean;
  message: string;
  student: any;
  class: AticoClass;
  reservation: any;
  attendance: any;
  creditConsumed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ClassesService {

  private http = inject(HttpClient);
  private api = 'http://localhost:3004/api/classes';

  getAll() {
    return this.http.get<AticoClass[]>(this.api);
  }

  create(payload: CreateClassPayload) {
    return this.http.post<AticoClass>(this.api, payload);
  }

  update(id: string, payload: UpdateClassPayload) {
    return this.http.patch<AticoClass>(`${this.api}/${id}`, payload);
  }

  checkIn(classId: string, studentId: string) {
    return this.http.post<ClassCheckInResponse>(`${this.api}/${classId}/check-in`, {
      studentId
    });
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
