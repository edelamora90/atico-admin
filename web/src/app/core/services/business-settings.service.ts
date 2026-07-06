import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export type RenewalPolicy = 'BY_MEMBERSHIP_EXPIRATION' | 'BY_CREDITS_DEPLETION';

export interface BusinessSettings {
  id: string;
  renewalPolicy: RenewalPolicy;
  renewalGraceDays: number;
  renewalFeeAmount: number;
  createdAt: string;
  updatedAt: string;
}

export type UpdateBusinessSettingsPayload = Partial<
  Pick<BusinessSettings, 'renewalPolicy' | 'renewalGraceDays' | 'renewalFeeAmount'>
>;

@Injectable({
  providedIn: 'root',
})
export class BusinessSettingsService {
  private http = inject(HttpClient);
  private api = '/api/business-settings';

  getSettings() {
    return this.http.get<BusinessSettings>(this.api);
  }

  updateSettings(payload: UpdateBusinessSettingsPayload) {
    return this.http.patch<BusinessSettings>(this.api, payload);
  }
}
