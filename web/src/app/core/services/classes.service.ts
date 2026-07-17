import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface CreateClassPayload {
  type: 'CLASS' | 'COURSE' | 'WORKSHOP' | 'EVENT' | 'RENTAL';
  area: 'DANCE' | 'MUSIC';
  title: string;
  teacherId?: string | null;
  roomId: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  capacity: number;
  teacherPaymentAmount: number;
  requiresEnrollment?: boolean;
  requiresPackage?: boolean;
  directEnrollmentCost?: number | null;
  teacherDirectPercentage?: number | null;
  rentalItems?: any;
  rentalItemIds?: string[];
  recurrenceType?: 'NONE' | 'WEEKLY' | 'CUSTOM';
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  recurrenceStart?: string | null;
  recurrenceEnd?: string | null;
  weeklySchedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  eventFunctions?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
}

export type UpdateClassPayload = Partial<CreateClassPayload>;

export interface ClassSession {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | string;
  roomId?: string | null;
  teacherId?: string | null;
}

export interface AticoClass {
  id: string;
  title: string;
  type: 'CLASS' | 'COURSE' | 'WORKSHOP' | 'EVENT' | 'RENTAL';
  area: 'DANCE' | 'MUSIC' | 'BOTH';
  startDate: string;
  endDate: string | null;
  durationMinutes: number;
  capacity: number;
  teacherPaymentAmount: number;
  requiresEnrollment?: boolean;
  requiresPackage?: boolean;
  directEnrollmentCost?: number | null;
  teacherDirectPercentage?: number | null;
  recurrenceType?: 'NONE' | 'WEEKLY' | 'CUSTOM';
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  recurrenceStart?: string | null;
  recurrenceEnd?: string | null;
  weeklySchedules?: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  eventFunctions?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
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
      sessionId?: string | null;
    }>;
  };
  rentalItems?: any;
  sessions?: ClassSession[];

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
  private api = '/api/classes';

  getAll() {
    return this.http.get<AticoClass[]>(this.api);
  }

  create(payload: CreateClassPayload) {
    return this.http.post<AticoClass>(this.api, payload);
  }

  update(id: string, payload: UpdateClassPayload) {
    return this.http.patch<AticoClass>(`${this.api}/${id}`, payload);
  }

  checkIn(sessionId: string, studentId: string) {
    return this.http.post<ClassCheckInResponse>(`${this.api}/sessions/${sessionId}/check-in`, {
      sessionId,
      studentId,
    });
  }

  delete(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
