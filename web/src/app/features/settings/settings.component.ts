import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BusinessSettings,
  BusinessSettingsService,
  RenewalPolicy,
} from '../../core/services/business-settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private businessSettingsService = inject(BusinessSettingsService);

  settings = signal<BusinessSettings | null>(null);
  loading = signal(true);
  saving = signal(false);
  message = signal('');
  errorMessage = signal('');

  form = {
    renewalPolicy: 'BY_MEMBERSHIP_EXPIRATION' as RenewalPolicy,
    renewalGraceDays: 15,
    renewalFeeAmount: 100,
  };

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.businessSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.form = {
          renewalPolicy: settings.renewalPolicy,
          renewalGraceDays: Number(settings.renewalGraceDays || 0),
          renewalFeeAmount: Number(settings.renewalFeeAmount || 0),
        };
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('No se pudo cargar la configuración.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.message.set('');
    this.errorMessage.set('');

    this.businessSettingsService.updateSettings({
      renewalPolicy: this.form.renewalPolicy,
      renewalGraceDays: Number(this.form.renewalGraceDays || 0),
      renewalFeeAmount: Number(this.form.renewalFeeAmount || 0),
    }).subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.message.set('Configuración guardada correctamente.');
        this.saving.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set(err?.error?.message || 'No se pudo guardar la configuración.');
        this.saving.set(false);
      },
    });
  }
}
