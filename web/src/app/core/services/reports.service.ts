import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface UtilitiesReport {
  totalIncome: number;
  totalExpenses: number;
  teacherPayments: number;
  utilityBeforeTeacherPayments: number;
  finalUtility: number;
  attendancesCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportsService {

  private http = inject(HttpClient);

  private api =
    '/api/reports';

  getUtilities() {
    return this.http.get<UtilitiesReport>(
      `${this.api}/utilities`
    );
  }
}
