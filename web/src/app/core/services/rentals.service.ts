import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Rental {
  id: string;
  customerName: string;
  roomId: string;
  amount: number;
  startDate: string;
  endDate: string;
  notes: string | null;
  room: {
    id: string;
    name: string;
    capacity: number;
  };
  createdAt: string;
}

export interface RentalPayload {
  customerName: string;
  roomId: string;
  amount: number;
  startDate: string;
  endDate: string;
  notes?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class RentalsService {
  private http = inject(HttpClient);
  private api = '/api/rentals';

  getAll() {
    return this.http.get<Rental[]>(this.api);
  }

  create(payload: RentalPayload) {
    return this.http.post<Rental>(this.api, payload);
  }

  delete(id: string, reason?: string) {
    return this.http.delete(`${this.api}/${id}`, {
      body: { reason },
    });
  }
}
