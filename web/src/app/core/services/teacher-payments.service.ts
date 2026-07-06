import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FinancePeriodFilter } from './finances.service';

export interface TeacherPaymentsParams {
  period?: FinancePeriodFilter;
  from?: string;
  to?: string;
  teacherId?: string;
  area?: 'DANCE' | 'MUSIC' | 'ALL';
}

export interface TeacherPaymentTeacher {
  teacherId: string | null;
  teacherName: string;
  classesCount: number;
  sessionsCount?: number;
  payableAttendancesCount: number;
  teacherPaymentTotal: number;
  averagePerClass: number;
  averagePerSession?: number;
}

export interface TeacherPaymentItem {
  id: string;
  date: string;
  teacherId: string | null;
  teacherName: string;
  sessionId: string;
  className: string;
  area: 'DANCE' | 'MUSIC' | string;
  studentId: string | null;
  studentName: string;
  packageName: string;
  packageArea: 'DANCE' | 'MUSIC' | string | null;
  teacherPayment: number;
  source: 'RESERVATION' | 'ATTENDANCE';
}

export interface TeacherPaymentsSummary {
  period: {
    key: string;
    from: string | null;
    to: string | null;
  };
  totals: {
    teacherPaymentTotal: number;
    teachersCount: number;
    classesCount: number;
    sessionsCount?: number;
    payableAttendancesCount: number;
    averagePerClass: number;
    averagePerSession?: number;
  };
  teachers: TeacherPaymentTeacher[];
  items: TeacherPaymentItem[];
}

@Injectable({
  providedIn: 'root'
})
export class TeacherPaymentsService {
  private http = inject(HttpClient);

  private api = 'http://localhost:3004/api/teacher-payments';

  getSummary(params: TeacherPaymentsParams = {}) {
    return this.http.get<TeacherPaymentsSummary>(`${this.api}/summary`, {
      params: this.cleanParams(params),
    });
  }

  private cleanParams(params: TeacherPaymentsParams): Record<string, string> {
    const clean: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value && value !== 'ALL') {
        clean[key] = String(value);
      }
    }

    return clean;
  }
}
