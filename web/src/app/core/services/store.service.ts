import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface StoreProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  salePrice: number;
  costPrice: number;
  stock: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreCheckoutPayload {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private http = inject(HttpClient);

  private api = '/api/store';

  getProducts() {
    return this.http.get<StoreProduct[]>(`${this.api}/products`);
  }

  checkout(payload: StoreCheckoutPayload) {
    return this.http.post(`${this.api}/checkout`, payload);
  }
}
