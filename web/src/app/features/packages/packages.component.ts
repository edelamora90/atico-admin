import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';

import {
  AticoPackage,
  PackagesService
} from '../../core/services/packages.service';

type AlertType = 'success' | 'error' | 'warning' | 'info';
type PackageAreaFilter = 'DANCE' | 'MUSIC';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-packages',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './packages.component.html',
  styleUrl: './packages.component.scss'
})
export class PackagesComponent implements OnInit {

  private packagesService = inject(PackagesService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  packages = signal<AticoPackage[]>([]);
  packageAreaFilter = signal<PackageAreaFilter>('DANCE');
  selectedPackage = signal<AticoPackage | null>(null);
  editingPackage = signal<AticoPackage | null>(null);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  pageAlert = signal<UiAlert | null>(null);
  formAlert = signal<UiAlert | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['PACKAGE'],
    area: ['DANCE', Validators.required],
    requiresEnrollment: [true],
    includesFreeInscription: [false],
    price: [0, Validators.required],
    credits: [0, Validators.required],
    teacherPercentage: [0, Validators.required],
    atticPercentage: [{ value: 100, disabled: true }],
    teacherPaymentPerClass: [{ value: 0, disabled: true }]
  });

  ngOnInit(): void {
    this.loadPackages();

    this.form.valueChanges.subscribe(() => {
      this.updateCalculatedFields();
    });
  }

  updateCalculatedFields(): void {
    const type = String(this.form.get('type')?.value || 'PACKAGE') as 'PACKAGE' | 'PROMOTION' | 'TRIAL' | 'DAY_PASS';
    const area = String(this.form.get('area')?.value || 'DANCE') as 'DANCE' | 'MUSIC';
    const requiresEnrollment = !!this.form.get('requiresEnrollment')?.value;
    const includesFreeInscription = !!this.form.get('includesFreeInscription')?.value;
    const price = Number(this.form.get('price')?.value || 0);
    const credits = Number(this.form.get('credits')?.value || 0);
    const teacherPercentage = Number(this.form.get('teacherPercentage')?.value || 0);

    const safeTeacherPercentage = Math.min(
      Math.max(teacherPercentage, 0),
      100
    );

    const atticPercentage = 100 - safeTeacherPercentage;

    const teacherPaymentPerClass =
      credits > 0
        ? (price / credits) * (safeTeacherPercentage / 100)
        : 0;

    this.form.patchValue(
      {
        atticPercentage,
        teacherPaymentPerClass
      },
      {
        emitEvent: false
      }
    );
  }


  loadPackages(): void {
    this.loading.set(true);

    this.packagesService.getAll().subscribe({
      next: (data) => {
        this.packages.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.setPageAlert('error', this.getApiErrorMessage(err, 'No se pudieron cargar los paquetes.'));
        this.loading.set(false);
      }
    });
  }

  openCreate(): void {
    this.clearAlerts();
    this.editingPackage.set(null);
    this.form.reset({
      name: '',
      type: 'PACKAGE',
      area: 'DANCE',
      requiresEnrollment: true,
      includesFreeInscription: false,
      price: 0,
      credits: 0,
      teacherPercentage: 0,
      atticPercentage: 100,
      teacherPaymentPerClass: 0
    });
    this.showForm.set(true);
  }

  openEdit(item: AticoPackage): void {
    this.clearAlerts();
    this.editingPackage.set(item);
    const area = item.area === 'DANCE' || item.area === 'MUSIC'
      ? item.area
      : '';

    this.form.patchValue({
      name: item.name,
      type: item.type || 'PACKAGE',
      area,
      requiresEnrollment: item.requiresEnrollment ?? true,
      includesFreeInscription: item.includesFreeInscription ?? false,
      price: item.price,
      credits: item.credits,
      teacherPercentage: item.teacherPercentage,
      atticPercentage: item.atticPercentage,
      teacherPaymentPerClass: item.teacherPaymentPerClass || 0
    });

    if (item.area === 'BOTH') {
      this.setFormAlert(
        'warning',
        'Este paquete tiene un área anterior no permitida. Selecciona Danza o Música para poder guardarlo.'
      );
    }

    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingPackage.set(null);
    this.saving.set(false);
    this.formAlert.set(null);
  }

  openDetail(item: AticoPackage): void {
    this.selectedPackage.set(item);
  }

  sendToPos(item: AticoPackage): void {
    this.router.navigate(['/pos'], {
      queryParams: {
        type: 'PACKAGE',
        id: item.id,
        area: item.area === 'MUSIC' ? 'MUSIC' : 'DANCE',
      },
    });
  }

  closeDetail(): void {
    this.selectedPackage.set(null);
  }

  save(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setFormAlert('warning', 'Completa los campos obligatorios.');
      return;
    }

    const wasEditing = !!this.editingPackage();

    const name = String(this.form.get('name')?.value || '');
    const type = String(this.form.get('type')?.value || 'PACKAGE') as 'PACKAGE' | 'PROMOTION' | 'TRIAL' | 'DAY_PASS';
    const area = String(this.form.get('area')?.value || '') as 'DANCE' | 'MUSIC' | '';
    const requiresEnrollment = !!this.form.get('requiresEnrollment')?.value;
    const includesFreeInscription = !!this.form.get('includesFreeInscription')?.value;
    const price = Number(this.form.get('price')?.value || 0);
    const credits = Number(this.form.get('credits')?.value || 0);
    const teacherPercentage = Number(this.form.get('teacherPercentage')?.value || 0);

    const safeTeacherPercentage = Math.min(
      Math.max(teacherPercentage, 0),
      100
    );

    if (area !== 'DANCE' && area !== 'MUSIC') {
      this.setFormAlert('warning', 'Selecciona Danza o Música para guardar el paquete.');
      return;
    }

    const atticPercentage = 100 - safeTeacherPercentage;

    const teacherPaymentPerClass =
      credits > 0
        ? (price / credits) * (safeTeacherPercentage / 100)
        : 0;

    const payload = {
      name,
      type,
      area,
      requiresEnrollment,
      includesFreeInscription,
      price,
      credits,
      teacherPercentage: safeTeacherPercentage,
      atticPercentage,
      teacherPaymentPerClass
    };

    this.saving.set(true);
    this.clearAlerts();

    const request = wasEditing
      ? this.packagesService.update(this.editingPackage()!.id, payload)
      : this.packagesService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadPackages();

        this.setPageAlert(
          'success',
          wasEditing
            ? 'Paquete editado correctamente.'
            : 'Paquete creado correctamente.'
        );
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.setFormAlert('error', this.getApiErrorMessage(err, 'No se pudo guardar el paquete.'));
      }
    });
  }


  deletePackage(item: AticoPackage): void {
    const confirmed = confirm(
      `¿Desactivar el paquete ${item.name}? No se borrará el historial relacionado.`
    );

    if (!confirmed) {
      return;
    }

    const reason = window.prompt('Motivo de desactivación');

    if (!reason || reason.trim().length < 3) {
      this.setPageAlert('warning', 'Captura un motivo de al menos 3 caracteres.');
      return;
    }

    this.clearAlerts();

    this.packagesService.delete(item.id, reason.trim()).subscribe({
      next: () => {
        this.closeDetail();
        this.loadPackages();
        this.setPageAlert('success', 'Paquete desactivado correctamente.');
      },
      error: (err) => {
        console.error(err);
        this.setPageAlert('error', this.getApiErrorMessage(err, 'No se pudo eliminar el paquete.'));
      }
    });
  }

  private setPageAlert(type: AlertType, message: string): void {
    this.pageAlert.set({ type, message });
  }

  private setFormAlert(type: AlertType, message: string): void {
    this.formAlert.set({ type, message });
  }

  private clearAlerts(): void {
    this.pageAlert.set(null);
    this.formAlert.set(null);
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return message || fallback;
  }

  getTotalSales(): number {
    return this.getFilteredPackages().reduce((total, item) => {
      return total + Number(item.memberships?.length || 0);
    }, 0);
  }

  setPackageAreaFilter(area: PackageAreaFilter): void {
    this.packageAreaFilter.set(area);
  }

  getFilteredPackages(): AticoPackage[] {
    return this.packages().filter((item) => item.area === this.packageAreaFilter());
  }

  getPackageAreaCount(area: PackageAreaFilter): number {
    return this.packages().filter((item) => item.area === area).length;
  }

  getPackageTypeLabel(item: AticoPackage): string {
    if (item.type === 'PROMOTION') return 'Promoción';
    if (item.type === 'TRIAL') return 'Clase muestra';
    if (item.type === 'DAY_PASS') return 'Day Pass';
    return 'Paquete';
  }

  getPackageTypeClass(item: AticoPackage): string {
    if (item.type === 'PROMOTION') return 'promotion';
    if (item.type === 'TRIAL') return 'trial';
    if (item.type === 'DAY_PASS') return 'day-pass';
    return 'package';
  }

  getPackageAreaLabel(area?: string): string {
    if (area === 'MUSIC') return 'Música';
    if (area === 'DANCE') return 'Danza';
    return 'Área no definida';
  }

  getPackageAreaClass(area?: string): string {
    if (area === 'MUSIC') return 'music';
    if (area === 'DANCE') return 'dance';
    return 'unknown';
  }

  getTeacherPaymentTotalEstimate(item: AticoPackage): number {
    const memberships = item.memberships?.length || 0;
    return memberships * Number(item.credits || 0) * Number(item.teacherPaymentPerClass || 0);
  }

}
