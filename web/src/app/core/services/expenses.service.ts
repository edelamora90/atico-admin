import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FinancePeriodFilter } from './finances.service';

export type ExpenseCategory =
  | 'RENT'
  | 'ELECTRICITY'
  | 'WATER'
  | 'PAYROLL'
  | 'MAINTENANCE'
  | 'CLEANING'
  | 'MARKETING'
  | 'STORE_SUPPLIES'
  | 'EQUIPMENT'
  | 'OTHER';

export interface Expense {
  id: string;
  concept: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayload {
  concept: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string | null;
}

export interface ExpenseListParams {
  period?: FinancePeriodFilter;
  from?: string;
  to?: string;
  category?: ExpenseCategory | 'ALL';
}

@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private http = inject(HttpClient);
  private api = 'http://localhost:3004/api/expenses';

  list(params: ExpenseListParams = {}) {
    const cleanParams: Record<string, string> = {};

    if (params.period) cleanParams['period'] = params.period;
    if (params.from) cleanParams['from'] = params.from;
    if (params.to) cleanParams['to'] = params.to;
    if (params.category && params.category !== 'ALL') {
      cleanParams['category'] = params.category;
    }

    return this.http.get<Expense[]>(this.api, { params: cleanParams });
  }

  create(payload: ExpensePayload) {
    return this.http.post<Expense>(this.api, payload);
  }

  update(id: string, payload: Partial<ExpensePayload>) {
    return this.http.patch<Expense>(`${this.api}/${id}`, payload);
  }

  delete(id: string) {
    return this.http.delete<{ success: boolean; deleted: Expense }>(`${this.api}/${id}`);
  }
}
