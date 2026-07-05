import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FinancePeriodFilter } from './finances.service';

export interface CreateAttendancePayload {
  reservationId: string;
  status: 'PRESENT' | 'ABSENT' | 'NO_SHOW';
}

export interface AttendanceHistoryItem {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  studentPhone?: string | null;
  classId: string;
  className: string;
  area: 'DANCE' | 'MUSIC' | 'BOTH';
  teacherId?: string | null;
  teacherName: string;
  status: 'PRESENT' | 'ABSENT' | 'ATTENDED' | 'RESERVED' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'WAITING_LIST' | 'RELEASED';
  creditConsumed: boolean;
  packageName: string;
  packageArea?: 'DANCE' | 'MUSIC' | 'BOTH' | null;
  teacherPayment: number;
  source: 'RESERVATION' | 'ATTENDANCE';
}

export interface AttendanceSummary {
  totalAttendances: number;
  creditsConsumed: number;
  teacherPaymentTotal: number;
  byArea: Array<{ area: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export interface AttendanceHistoryParams {
  period?: FinancePeriodFilter;
  from?: string;
  to?: string;
  studentId?: string;
  classId?: string;
  teacherId?: string;
  area?: 'DANCE' | 'MUSIC' | 'ALL';
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendancesService {

  private http = inject(HttpClient);

  private api =
    'http://localhost:3004/api/attendances';

  create(payload: CreateAttendancePayload) {
    return this.http.post(this.api, payload);
  }

  list(params: AttendanceHistoryParams = {}) {
    return this.http.get<AttendanceHistoryItem[]>(this.api, {
      params: this.cleanParams(params),
    });
  }

  summary(params: AttendanceHistoryParams = {}) {
    return this.http.get<AttendanceSummary>(`${this.api}/summary`, {
      params: this.cleanParams(params),
    });
  }

  private cleanParams(params: AttendanceHistoryParams): Record<string, string> {
    const clean: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value && value !== 'ALL') {
        clean[key] = String(value);
      }
    }

    return clean;
  }
}
