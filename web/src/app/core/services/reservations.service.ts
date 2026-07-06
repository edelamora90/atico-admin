import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';

export interface CreateReservationPayload {
  studentId: string;
  sessionId: string;
}

export interface ReservationFilters {
  period?: string;
  status?: string;
  area?: string;
}

export interface ReservationItem {
  id: string;
  studentId: string;
  sessionId: string;
  status: string;
  creditConsumed: boolean;
  creditMembershipId?: string | null;
  packageName?: string | null;
  packageArea?: string | null;
  classDate?: string;
  session?: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
  } | null;
  className?: string;
  teacherName?: string | null;
  studentName?: string | null;
  area?: string;
  creditLabel?: string;
  canCancel?: boolean;
  createdAt: string;
  student?: {
    id: string;
    name: string;
  };
  class?: {
    id: string;
    startDate: string;
    area: string;
    type?: string;
    course?: {
      name: string;
    };
    teacher?: {
      name: string;
    };
    room?: {
      name: string;
    };
  };
}

export interface CancelReservationResponse {
  message: string;
  creditRefunded: boolean;
  reservation: ReservationItem;
}

@Injectable({
  providedIn: 'root'
})
export class ReservationsService {

  private http = inject(HttpClient);

  private api =
    'http://localhost:3004/api/reservations';

  list(filters: ReservationFilters = {}) {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'ALL') {
        params = params.set(key, value);
      }
    });

    return this.http.get<ReservationItem[]>(this.api, { params });
  }

  create(payload: CreateReservationPayload) {
    return this.http.post(this.api, payload);
  }

  update(id: string, payload: any) {
    return this.http.patch(`${this.api}/${id}`, payload);
  }

  cancel(id: string) {
    return this.http.patch<CancelReservationResponse>(
      `${this.api}/${id}/cancel`,
      {}
    );
  }
}
