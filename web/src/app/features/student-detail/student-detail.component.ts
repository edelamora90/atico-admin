import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  Student,
  StudentsService
} from '../../core/services/students.service';

type AcademicArea = 'DANCE' | 'MUSIC' | 'BOTH';

interface UiAlert {
  type: 'error' | 'info';
  message: string;
}

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './student-detail.component.html',
  styleUrl: './student-detail.component.scss'
})
export class StudentDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private studentsService = inject(StudentsService);

  student = signal<Student | null>(null);
  loading = signal(true);
  alert = signal<UiAlert | null>(null);

  activeMemberships = computed(() => {
    const now = new Date();

    return this.sortedMemberships().filter((membership) => {
      return membership.status === 'ACTIVE'
        && membership.expirationDate
        && new Date(membership.expirationDate) >= now;
    });
  });

  expiredOrHistoricalMemberships = computed(() => {
    const activeIds = new Set(this.activeMemberships().map((membership) => membership.id));

    return this.sortedMemberships().filter((membership) => !activeIds.has(membership.id));
  });

  danceCredits = computed(() => this.getActiveCreditsByArea('DANCE'));
  musicCredits = computed(() => this.getActiveCreditsByArea('MUSIC'));

  danceActiveMembership = computed(() => this.getActiveMembershipByArea('DANCE'));
  musicActiveMembership = computed(() => this.getActiveMembershipByArea('MUSIC'));
  danceActiveMembershipCount = computed(() => this.getActiveMembershipCountByArea('DANCE'));
  musicActiveMembershipCount = computed(() => this.getActiveMembershipCountByArea('MUSIC'));
  danceNextExpiration = computed(() => this.getActiveMembershipByArea('DANCE')?.expirationDate || null);
  musicNextExpiration = computed(() => this.getActiveMembershipByArea('MUSIC')?.expirationDate || null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.alert.set({
        type: 'error',
        message: 'No se encontró el alumno solicitado.'
      });
      this.loading.set(false);
      return;
    }

    this.loadStudent(id);
  }

  loadStudent(id: string): void {
    this.loading.set(true);
    this.alert.set(null);

    this.studentsService.getById(id).subscribe({
      next: (student) => {
        this.student.set(student);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.alert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo cargar el expediente del alumno.')
        });
        this.loading.set(false);
      }
    });
  }

  navigateToPosForPackage(area?: 'DANCE' | 'MUSIC'): void {
    const student = this.student();

    if (!student) {
      return;
    }

    this.router.navigate(['/pos'], {
      queryParams: {
        studentId: student.id,
        mode: 'academic',
        ...(area ? { area } : {}),
      },
    });
  }

  sortedMemberships(): any[] {
    return [...(this.student()?.memberships || [])].sort((a, b) => {
      return new Date(b.createdAt || b.startDate || 0).getTime()
        - new Date(a.createdAt || a.startDate || 0).getTime();
    });
  }

  sortedPayments(): any[] {
    return [...(this.student()?.payments || [])].sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  recentActivity(): any[] {
    const reservations = (this.student()?.reservations || []).map((reservation: any) => ({
      id: `reservation-${reservation.id}`,
      type: 'reservation',
      date: reservation.class?.startDate || reservation.createdAt,
      className: reservation.class?.title || reservation.class?.course?.name || 'Clase',
      area: reservation.class?.area,
      teacherName: reservation.class?.teacher?.name || 'Sin docente',
      status: reservation.status,
      creditConsumed: reservation.creditConsumed,
      membershipName: reservation.creditMembership?.package?.name || 'Sin membresía ligada',
    }));

    const attendances = (this.student()?.attendances || []).map((attendance: any) => ({
      id: `attendance-${attendance.id}`,
      type: 'attendance',
      date: attendance.class?.startDate || attendance.createdAt,
      className: attendance.class?.title || attendance.class?.course?.name || 'Clase',
      area: attendance.class?.area,
      teacherName: attendance.class?.teacher?.name || 'Sin docente',
      status: attendance.status === 'PRESENT' ? 'ATTENDED' : attendance.status,
      creditConsumed: attendance.status === 'PRESENT',
      membershipName: 'Asistencia directa',
    }));

    return [...reservations, ...attendances]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 20);
  }

  hasMedicalInformation(): boolean {
    const student = this.student();

    if (!student) return false;

    return [
      student.bloodType,
      student.allergies,
      student.medicalConditions,
      student.medications,
      student.injuries,
      student.medicalNotes,
      student.emergencyContactName,
      student.emergencyContactRelationship,
      student.emergencyContactPhone,
      student.emergencyContactPhone2,
    ].some((value) => !!String(value || '').trim());
  }

  getActiveCreditsByArea(area: 'DANCE' | 'MUSIC'): number {
    return this.activeMemberships()
      .filter((membership) => membership.package?.area === area)
      .reduce((total, membership) => total + Number(membership.availableCredits || 0), 0);
  }

  getActiveMembershipByArea(area: 'DANCE' | 'MUSIC'): any | null {
    return this.activeMemberships()
      .filter((membership) => membership.package?.area === area)
      .sort((a, b) => new Date(a.expirationDate || 0).getTime() - new Date(b.expirationDate || 0).getTime())[0] || null;
  }

  getActiveMembershipCountByArea(area: 'DANCE' | 'MUSIC'): number {
    return this.activeMemberships()
      .filter((membership) => membership.package?.area === area).length;
  }

  getUsedCredits(membership: any): number {
    return Math.max(Number(membership.initialCredits || 0) - Number(membership.availableCredits || 0), 0);
  }

  getPaymentFolio(payment: any): string {
    const item = payment?.posSaleItems?.find((saleItem: any) => saleItem.sale?.folio || saleItem.sale?.id);
    return item?.sale?.folio || item?.sale?.id || '';
  }

  getPaymentConceptLabel(concept: string | null | undefined): string {
    const labels: Record<string, string> = {
      INSCRIPCION: 'Inscripción',
      RENEWAL: 'Renovación',
      PAQUETE: 'Paquete',
      DAY_PASS: 'Day Pass',
      EVENTO: 'Evento',
      CURSO: 'Curso',
      RENTA: 'Renta',
      CAFETERIA: 'Cafetería',
      TIENDA: 'Tienda',
    };

    return concept ? labels[concept] || concept : 'Sin concepto';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAreaLabel(area: AcademicArea | string | null | undefined): string {
    if (area === 'MUSIC') return 'Música';
    if (area === 'BOTH') return 'Danza y Música';
    return 'Danza';
  }

  getAreaClass(area: AcademicArea | string | null | undefined): string {
    if (area === 'MUSIC') return 'music';
    if (area === 'BOTH') return 'both';
    return 'dance';
  }

  getMembershipStatusLabel(membership: any): string {
    if (membership.status === 'CANCELLED') return 'Cancelado';
    if (membership.status === 'EXPIRED' || this.isExpired(membership)) return 'Vencido';
    if (Number(membership.availableCredits || 0) <= 0 || membership.depletedAt) return 'Agotado';
    return 'Activo';
  }

  getContinuityLabel(): string {
    const continuity = this.student()?.studentContinuity;

    if (!continuity) return 'Sin estado';
    if (continuity.continuityStatus === 'ACTIVE') return 'Activo';
    if (continuity.continuityStatus === 'GRACE_PERIOD') return `En periodo de gracia hasta ${this.formatDate(continuity.graceUntil)}`;
    if (continuity.continuityStatus === 'INSCRIBED_NO_MEMBERSHIP') return 'Inscrito sin paquete';
    if (continuity.continuityStatus === 'EXPIRED_NEEDS_RENEWAL') {
      return `Requiere renovación ${this.formatCurrency(continuity.renewalFeeAmount)}`;
    }
    if (continuity.continuityStatus === 'NEW_NEEDS_INSCRIPTION') return 'Requiere inscripción inicial';

    return 'Sin estado';
  }

  getContinuityNote(): string {
    const continuity = this.student()?.studentContinuity;

    if (!continuity) return 'No se pudo calcular la continuidad.';
    if (continuity.continuityStatus === 'GRACE_PERIOD') {
      return `Puede renovar sin cargo adicional hasta ${this.formatDate(continuity.graceUntil)}.`;
    }
    if (continuity.continuityStatus === 'INSCRIBED_NO_MEMBERSHIP') {
      return 'Puede comprar su primer paquete desde Caja / POS.';
    }
    if (continuity.requiresRenewal) {
      return 'Debe pagar renovación para reactivar continuidad.';
    }
    if (continuity.requiresInitialInscription) {
      return 'Debe pagar inscripción inicial antes de comprar paquetes que la requieran.';
    }

    return continuity.reason;
  }

  getContinuityClass(): string {
    const status = this.student()?.studentContinuity?.continuityStatus;

    if (status === 'ACTIVE') return 'active';
    if (status === 'GRACE_PERIOD') return 'active';
    if (status === 'INSCRIBED_NO_MEMBERSHIP') return 'active';
    if (status === 'EXPIRED_NEEDS_RENEWAL') return 'expired';
    if (status === 'NEW_NEEDS_INSCRIPTION') return 'expired';

    return '';
  }

  formatCurrency(value: number | null | undefined): string {
    return Number(value || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }

  getStatusLabel(status: string | null | undefined): string {
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      CANCELLED: 'Cancelado',
      EXPIRED: 'Vencido',
      RESERVED: 'Reservado',
      CONFIRMED: 'Confirmado',
      WAITING_LIST: 'Lista espera',
      RELEASED: 'Liberado',
      ATTENDED: 'Asistió',
      NO_SHOW: 'No asistió',
      PRESENT: 'Presente',
      ABSENT: 'Ausente',
      ACTIVO: 'Activo',
      INACTIVO: 'Inactivo',
      BLOQUEADO: 'Bloqueado',
    };

    return status ? labels[status] || status : 'Sin estado';
  }

  isExpired(membership: any): boolean {
    return !!membership.expirationDate && new Date(membership.expirationDate) < new Date();
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    return fallback;
  }
}
