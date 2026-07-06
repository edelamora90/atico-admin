import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type FinancePeriodFilter = 'today' | 'this-month' | 'last-30-days' | 'all';

export interface FinanceSummary {
  period: {
    key: string;
    from: string | null;
    to: string | null;
  };
  totals: {
    income: number;
    grossIncome: number;
    academicIncome: number;
    storeIncome: number;
    expenses: number;
    teacherPayments: number;
    utilityBeforeTeachers: number;
    finalUtility: number;
    academicUtilityBeforeTeachers: number;
    academicFinalUtility: number;
    generalUtilityBeforeTeachers: number;
    generalFinalUtility: number;
    generalMargin: number;
    margin: number;
    academicSalesCount: number;
    creditsSold: number;
    averageAcademicSale: number;
    attendancesCount: number;
    storeSalesCount: number;
  };
  productDistribution: Array<{
    productName: string;
    area: string;
    salesCount: number;
    credits: number;
    income: number;
    percentage: number;
  }>;
  expenseDistribution: Array<{
    category: string;
    categoryLabel: string;
    amount: number;
    percentage: number;
  }>;
  latestAcademicSales: Array<{
    date: string;
    studentName: string;
    productName: string;
    area: string;
    amount: number;
    credits: number;
    availableCredits: number;
    expirationDate: string | null;
    status: string;
  }>;
  expenses: Array<{
    id: string;
    date: string;
    label: string;
    concept: string;
    category: string;
    categoryLabel: string;
    amount: number;
    notes?: string | null;
    createdAt: string;
  }>;
  chartData: {
    incomeVsExpenses: Array<{
      label: string;
      value: number;
    }>;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FinancesService {
  private http = inject(HttpClient);

  private api = '/api/finances';

  getSummary(period: FinancePeriodFilter = 'all') {
    return this.http.get<FinanceSummary>(`${this.api}/summary`, {
      params: {
        period,
      },
    });
  }
}
