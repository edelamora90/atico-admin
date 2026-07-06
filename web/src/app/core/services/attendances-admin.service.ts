import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AttendancesAdminService {

  private http = inject(HttpClient);

  private api =
    '/api/attendances';

  getAll() {
    return this.http.get<any[]>(this.api);
  }

}
