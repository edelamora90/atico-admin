import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  BusinessSettings,
  BusinessSettingsService,
  RenewalPolicy,
} from '../../core/services/business-settings.service';
import {
  TeacherPaymentRangeSetting,
  TeacherPaymentSettings,
  TeacherPaymentsService,
} from '../../core/services/teacher-payments.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
  private businessSettingsService = inject(BusinessSettingsService);
  private teacherPaymentsService = inject(TeacherPaymentsService);

  settings = signal<BusinessSettings | null>(null);
  teacherPaymentSettings = signal<TeacherPaymentSettings | null>(null);
  loading = signal(true);
  teacherPaymentLoading = signal(true);
  saving = signal(false);
  teacherPaymentSaving = signal(false);
  message = signal('');
  errorMessage = signal('');
  teacherPaymentMessage = signal('');
  teacherPaymentErrorMessage = signal('');
  simulationAttendees = signal(2);

  form = {
    renewalPolicy: 'BY_MEMBERSHIP_EXPIRATION' as RenewalPolicy,
    renewalGraceDays: 15,
    renewalFeeAmount: 100,
  };

  teacherPaymentForm = {
    minimumClassAmount: 50,
    cancellationWithPaymentAmount: null as number | null,
    ranges: [] as TeacherPaymentRangeSetting[],
  };

  ngOnInit(): void {
    this.loadSettings();
    this.loadTeacherPaymentSettings();
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

  loadTeacherPaymentSettings(): void {
    this.teacherPaymentLoading.set(true);
    this.teacherPaymentMessage.set('');
    this.teacherPaymentErrorMessage.set('');

    this.teacherPaymentsService.getSettings().subscribe({
      next: (settings) => {
        this.teacherPaymentSettings.set(settings);
        this.teacherPaymentForm = {
          minimumClassAmount: Number(settings.minimumClassAmount || 0),
          cancellationWithPaymentAmount: settings.cancellationWithPaymentAmount,
          ranges: this.cloneRanges(settings.ranges),
        };
        this.teacherPaymentLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.teacherPaymentErrorMessage.set('No se pudo cargar el esquema de pago a maestros.');
        this.teacherPaymentLoading.set(false);
      },
    });
  }

  saveTeacherPaymentSettings(): void {
    const validationError = this.getTeacherPaymentValidationError();

    if (validationError) {
      this.teacherPaymentErrorMessage.set(validationError);
      this.teacherPaymentMessage.set('');
      return;
    }

    this.teacherPaymentSaving.set(true);
    this.teacherPaymentMessage.set('');
    this.teacherPaymentErrorMessage.set('');

    this.teacherPaymentsService.updateSettings({
      minimumClassAmount: Number(this.teacherPaymentForm.minimumClassAmount || 0),
      cancellationWithPaymentAmount: this.teacherPaymentForm.cancellationWithPaymentAmount === null ||
        this.teacherPaymentForm.cancellationWithPaymentAmount === undefined
        ? null
        : Number(this.teacherPaymentForm.cancellationWithPaymentAmount || 0),
      ranges: this.cloneRanges(this.teacherPaymentForm.ranges),
    }).subscribe({
      next: (settings) => {
        this.teacherPaymentSettings.set(settings);
        this.teacherPaymentForm = {
          minimumClassAmount: Number(settings.minimumClassAmount || 0),
          cancellationWithPaymentAmount: settings.cancellationWithPaymentAmount,
          ranges: this.cloneRanges(settings.ranges),
        };
        this.teacherPaymentMessage.set('Esquema de pago a maestros guardado correctamente.');
        this.teacherPaymentSaving.set(false);
      },
      error: (err) => {
        console.error(err);
        this.teacherPaymentErrorMessage.set(err?.error?.message || 'No se pudo guardar el esquema de pago.');
        this.teacherPaymentSaving.set(false);
      },
    });
  }

  addTeacherPaymentRange(): void {
    const last = this.teacherPaymentForm.ranges[this.teacherPaymentForm.ranges.length - 1];
    const minStudents = last?.maxStudents !== null && last?.maxStudents !== undefined
      ? Number(last.maxStudents) + 1
      : 0;

    this.teacherPaymentForm.ranges = [
      ...this.teacherPaymentForm.ranges,
      {
        minStudents,
        maxStudents: null,
        amount: Number(this.teacherPaymentForm.minimumClassAmount || 0),
      },
    ];
  }

  removeTeacherPaymentRange(index: number): void {
    this.teacherPaymentForm.ranges = this.teacherPaymentForm.ranges.filter((_, itemIndex) => itemIndex !== index);
  }

  restoreDefaultTeacherPaymentSettings(): void {
    this.teacherPaymentForm = {
      minimumClassAmount: 50,
      cancellationWithPaymentAmount: null,
      ranges: [
        { minStudents: 0, maxStudents: 1, amount: 50 },
        { minStudents: 2, maxStudents: 3, amount: 80 },
        { minStudents: 4, maxStudents: 4, amount: 100 },
        { minStudents: 5, maxStudents: 5, amount: 120 },
        { minStudents: 6, maxStudents: 6, amount: 140 },
        { minStudents: 7, maxStudents: 7, amount: 160 },
        { minStudents: 8, maxStudents: 8, amount: 180 },
        { minStudents: 9, maxStudents: null, amount: 200 },
      ],
    };
  }

  cancelTeacherPaymentChanges(): void {
    const settings = this.teacherPaymentSettings();

    if (!settings) {
      this.loadTeacherPaymentSettings();
      return;
    }

    this.teacherPaymentForm = {
      minimumClassAmount: Number(settings.minimumClassAmount || 0),
      cancellationWithPaymentAmount: settings.cancellationWithPaymentAmount,
      ranges: this.cloneRanges(settings.ranges),
    };
    this.teacherPaymentMessage.set('');
    this.teacherPaymentErrorMessage.set('');
  }

  setRangeMaxStudents(index: number, value: string): void {
    const next = this.cloneRanges(this.teacherPaymentForm.ranges);
    next[index] = {
      ...next[index],
      maxStudents: value === '' ? null : Number(value),
    };
    this.teacherPaymentForm.ranges = next;
  }

  getSimulatedTeacherPayment(): number {
    const attendees = Math.max(0, Number(this.simulationAttendees() || 0));
    const ranges = this.cloneRanges(this.teacherPaymentForm.ranges)
      .sort((a, b) => Number(a.minStudents || 0) - Number(b.minStudents || 0));
    const range = ranges.find((item) => {
      return attendees >= Number(item.minStudents || 0) &&
        (item.maxStudents === null || attendees <= Number(item.maxStudents));
    });

    return Number(range?.amount ?? this.teacherPaymentForm.minimumClassAmount ?? 0);
  }

  getCancellationWithPaymentPreview(): number {
    return Number(
      this.teacherPaymentForm.cancellationWithPaymentAmount ??
      this.teacherPaymentForm.minimumClassAmount ??
      0,
    );
  }

  private getTeacherPaymentValidationError(): string {
    if (Number(this.teacherPaymentForm.minimumClassAmount || 0) < 0) {
      return 'El monto mínimo por clase no puede ser negativo.';
    }

    if (
      this.teacherPaymentForm.cancellationWithPaymentAmount !== null &&
      this.teacherPaymentForm.cancellationWithPaymentAmount !== undefined &&
      String(this.teacherPaymentForm.cancellationWithPaymentAmount) !== '' &&
      Number(this.teacherPaymentForm.cancellationWithPaymentAmount) < 0
    ) {
      return 'El pago por cancelación con derecho a pago no puede ser negativo.';
    }

    const ranges = this.cloneRanges(this.teacherPaymentForm.ranges)
      .sort((a, b) => Number(a.minStudents || 0) - Number(b.minStudents || 0));

    if (ranges.length === 0) {
      return 'Agrega al menos un rango de pago.';
    }

    let previousMax = -1;
    let coversZero = false;
    let hasOpenFinalRange = false;

    for (const range of ranges) {
      const minStudents = Number(range.minStudents);
      const maxStudents = range.maxStudents === null || range.maxStudents === undefined
        ? null
        : Number(range.maxStudents);
      const amount = Number(range.amount);

      if (!Number.isInteger(minStudents) || minStudents < 0) {
        return 'El campo Desde alumnos debe ser un entero mayor o igual a 0.';
      }

      if (maxStudents !== null && (!Number.isInteger(maxStudents) || maxStudents < minStudents)) {
        return 'El campo Hasta alumnos debe estar vacío o ser mayor/igual que Desde alumnos.';
      }

      if (!Number.isFinite(amount) || amount < 0) {
        return 'Los montos de los rangos no pueden ser negativos.';
      }

      if (minStudents <= previousMax) {
        return 'Los rangos no pueden traslaparse.';
      }

      if (minStudents <= 0 && (maxStudents === null || maxStudents >= 0)) {
        coversZero = true;
      }

      if (maxStudents === null) {
        hasOpenFinalRange = true;
        previousMax = Number.MAX_SAFE_INTEGER;
      } else {
        previousMax = maxStudents;
      }
    }

    if (!coversZero) {
      return 'Debe existir un rango que cubra 0 alumnos.';
    }

    if (!hasOpenFinalRange) {
      return 'Debe existir un rango final "en adelante".';
    }

    return '';
  }

  private cloneRanges(ranges: TeacherPaymentRangeSetting[]): TeacherPaymentRangeSetting[] {
    return (ranges || []).map((range, index) => ({
      id: range.id,
      minStudents: Number(range.minStudents || 0),
      maxStudents: range.maxStudents === null || range.maxStudents === undefined
        ? null
        : Number(range.maxStudents),
      amount: Number(range.amount || 0),
      sortOrder: range.sortOrder ?? index,
    }));
  }
}
