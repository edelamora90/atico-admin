import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface RoomItem {
  id: string;
  roomId: string;
  name: string;
  price: number;
  active: boolean;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  basePrice: number;
  active: boolean;
  createdAt: string;
  items: RoomItem[];
}

export interface RoomPayload {
  name: string;
  capacity: number;
  basePrice: number;
  active?: boolean;
}

export interface RoomItemPayload {
  name: string;
  price: number;
  active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private http = inject(HttpClient);
  private api = '/api/rooms';

  getAll() {
    return this.http.get<Room[]>(this.api);
  }

  create(payload: RoomPayload) {
    return this.http.post<Room>(this.api, payload);
  }

  update(id: string, payload: RoomPayload) {
    return this.http.patch<Room>(`${this.api}/${id}`, payload);
  }

  delete(id: string, reason?: string) {
    return this.http.delete(`${this.api}/${id}`, {
      body: { reason },
    });
  }

  createItem(roomId: string, payload: RoomItemPayload) {
    return this.http.post<RoomItem>(`${this.api}/${roomId}/items`, payload);
  }

  deleteItem(itemId: string, reason?: string) {
    return this.http.delete(`${this.api}/items/${itemId}`, {
      body: { reason },
    });
  }
}
