import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type PosCheckoutItemType = 'ACADEMIC' | 'INSCRIPTION' | 'RENEWAL' | 'STORE' | 'RENTAL' | 'COURSE_EVENT';
export type PosCheckoutSaleType = 'STORE' | 'ACADEMIC' | 'MIXED';

export interface PosCheckoutPayload {
  studentId?: string;
  items: Array<{
    type: PosCheckoutItemType;
    packageId?: string;
    productId?: string;
    rentalId?: string;
    courseEventId?: string;
    quantity?: number;
  }>;
}

export interface PosCheckoutResponse {
  success: boolean;
  sale: PosSale;
  saleType: PosCheckoutSaleType;
  student: any | null;
  items: PosSaleItem[];
  payments: any[];
  memberships: any[];
  storeSales: any[];
  total: number;
  message: string;
}

export interface PosSaleItem {
  id?: string;
  type: PosCheckoutItemType;
  name: string;
  quantity: number;
  unitPrice?: number;
  total: number;
  packageId?: string | null;
  productId?: string | null;
  rentalId?: string | null;
  courseEventId?: string | null;
  membershipId?: string | null;
  storeSaleId?: string | null;
  paymentId?: string | null;
  payment?: any;
  membership?: any;
  storeSale?: any;
  product?: any;
  package?: any;
}

export interface PosSale {
  id: string;
  folio?: string | null;
  saleType: PosCheckoutSaleType;
  studentId?: string | null;
  student?: any | null;
  total: number;
  createdAt: string;
  items: PosSaleItem[];
}

export interface CashRegisterClose {
  id: string;
  date: string;
  from: string;
  to: string;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
  notes?: string | null;
  closedByName?: string | null;
  reviewedByName?: string | null;
  createdAt: string;
}

export interface CashCutSummary {
  from: string;
  to: string;
  totalSales: number;
  totalAmount: number;
  totalIncome: number;
  storeAmount: number;
  storeIncome: number;
  academicAmount: number;
  academicIncome: number;
  packageIncome: number;
  inscriptionAmount: number;
  inscriptionIncome: number;
  renewalAmount: number;
  renewalIncome: number;
  mixedAmount: number;
  salesByType: Array<{
    saleType: PosCheckoutSaleType;
    count: number;
    amount: number;
  }>;
  sales: PosSale[];
}

@Injectable({
  providedIn: 'root'
})
export class PosService {
  private http = inject(HttpClient);
  private api = '/api/pos';

  checkout(payload: PosCheckoutPayload) {
    return this.http.post<PosCheckoutResponse>(`${this.api}/checkout`, payload);
  }

  getSales(params: Record<string, string> = {}) {
    return this.http.get<PosSale[]>(`${this.api}/sales`, { params });
  }

  getSale(id: string) {
    return this.http.get<PosSale>(`${this.api}/sales/${id}`);
  }

  getCashCut(params: Record<string, string> = {}) {
    return this.http.get<CashCutSummary>(`${this.api}/cash-cut`, { params });
  }

  createCashClose(payload: {
    from?: string;
    to?: string;
    countedAmount: number;
    notes?: string;
    closedByName?: string;
    reviewedByName?: string;
  }) {
    return this.http.post<CashRegisterClose>(`${this.api}/cash-close`, payload);
  }

  getCashCloses(params: Record<string, string> = {}) {
    return this.http.get<CashRegisterClose[]>(`${this.api}/cash-close`, { params });
  }
}
