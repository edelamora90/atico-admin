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
  attendeesCount: number;
  observation: string;
  cancellationType: 'WITH_TEACHER_PAYMENT' | 'WITHOUT_TEACHER_PAYMENT' | null;
  cancellationReason: string | null;
  source: 'CLASS_SESSION' | 'DIRECT_ENROLLMENT';
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

export interface TeacherPaymentRangeSetting {
  id?: string;
  minStudents: number;
  maxStudents: number | null;
  amount: number;
  sortOrder?: number;
}

export interface TeacherPaymentSettings {
  id: string;
  minimumClassAmount: number;
  cancellationWithPaymentAmount: number | null;
  isActive: boolean;
  ranges: TeacherPaymentRangeSetting[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateTeacherPaymentSettingsPayload {
  minimumClassAmount: number;
  cancellationWithPaymentAmount?: number | null;
  ranges: TeacherPaymentRangeSetting[];
}

@Injectable({
  providedIn: 'root'
})
export class TeacherPaymentsService {
  private http = inject(HttpClient);

  private api = '/api/teacher-payments';

  getSummary(params: TeacherPaymentsParams = {}) {
    return this.http.get<TeacherPaymentsSummary>(`${this.api}/summary`, {
      params: this.cleanParams(params),
    });
  }

  getSettings() {
    return this.http.get<TeacherPaymentSettings>(`${this.api}/settings`);
  }

  updateSettings(payload: UpdateTeacherPaymentSettingsPayload) {
    return this.http.put<TeacherPaymentSettings>(`${this.api}/settings`, payload);
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
