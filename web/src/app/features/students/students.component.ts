import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  CreateStudentPayload,
  Student,
  StudentsService
} from '../../core/services/students.service';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss'
})
export class StudentsComponent implements OnInit {

  private studentsService = inject(StudentsService);

  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private fb = inject(FormBuilder);

  students = signal<Student[]>([]);

  loading = signal(true);

  saving = signal(false);

  showForm = signal(false);

  editingStudentId = signal<string | null>(null);

  selectedStudent = signal<Student | null>(null);

  studentIdFromQuery = signal<string | null>(null);

  alert = signal<UiAlert | null>(null);

  form = this.fb.group({
    name: ['', Validators.required],
    email: [''],
    phone: ['', Validators.required],

    birthDate: [''],
    bloodType: [''],
    allergies: [''],
    medicalConditions: [''],
    medications: [''],
    injuries: [''],
    medicalNotes: [''],

    emergencyContactName: [''],
    emergencyContactRelationship: [''],
    emergencyContactPhone: [''],
    emergencyContactPhone2: [''],

    photoConsent: [false],
    mediaConsent: [false],
    rulesAccepted: [false, Validators.requiredTrue]
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe(() => {
      this.openStudentFromRoute();
    });

    this.route.queryParamMap.subscribe(() => {
      this.openStudentFromRoute();
    });

    this.loadStudents();
  }

  loadStudents(): void {
    this.loading.set(true);

    this.studentsService
      .getAll()
      .subscribe({
        next: (data) => {
          this.students.set(data);
          this.openStudentFromRoute();
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);
          this.setAlert('error', this.getApiErrorMessage(err, 'No se pudieron cargar los alumnos.'));
          this.loading.set(false);
        }
      });
  }

  openDetail(student: Student): void {
    this.router.navigate(['/students', student.id]);
  }

  closeDetail(): void {
    this.selectedStudent.set(null);
    this.router.navigate(['/students']);
  }

  openForm(): void {
    this.clearAlert();
    this.editingStudentId.set(null);
    this.showForm.set(true);
  }

  editStudent(student: Student): void {
    this.clearAlert();
    this.editingStudentId.set(student.id);

    this.form.patchValue({
      name: student.name ?? '',
      email: student.email ?? '',
      phone: student.phone ?? '',

      birthDate: student.birthDate ? student.birthDate.substring(0, 10) : '',
      bloodType: student.bloodType ?? '',
      allergies: student.allergies ?? '',
      medicalConditions: student.medicalConditions ?? '',
      medications: student.medications ?? '',
      injuries: student.injuries ?? '',
      medicalNotes: student.medicalNotes ?? '',

      emergencyContactName: student.emergencyContactName ?? '',
      emergencyContactRelationship: student.emergencyContactRelationship ?? '',
      emergencyContactPhone: student.emergencyContactPhone ?? '',
      emergencyContactPhone2: student.emergencyContactPhone2 ?? '',

      photoConsent: student.photoConsent ?? false,
      mediaConsent: student.mediaConsent ?? false,
      rulesAccepted: student.rulesAccepted ?? false
    });

    this.selectedStudent.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingStudentId.set(null);
    this.saving.set(false);
    this.clearAlert();

    this.form.reset({
      name: '',
      email: '',
      phone: '',

      birthDate: '',
      bloodType: '',
      allergies: '',
      medicalConditions: '',
      medications: '',
      injuries: '',
      medicalNotes: '',

      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone: '',
      emergencyContactPhone2: '',

      photoConsent: false,
      mediaConsent: false,
      rulesAccepted: false
    });
  }

  saveStudent(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setAlert('warning', 'Faltan campos obligatorios. Revisa los campos marcados con *.');
      return;
    }

    this.saving.set(true);
    this.clearAlert();

    const value = this.form.value;

    const payload = this.cleanPayload({
      name: this.cleanRequiredString(value.name),
      phone: this.cleanRequiredString(value.phone),
      email: this.cleanOptionalString(value.email),

      birthDate: this.cleanOptionalString(value.birthDate),
      bloodType: this.cleanOptionalString(value.bloodType),
      allergies: this.cleanOptionalString(value.allergies),
      medicalConditions: this.cleanOptionalString(value.medicalConditions),
      medications: this.cleanOptionalString(value.medications),
      injuries: this.cleanOptionalString(value.injuries),
      medicalNotes: this.cleanOptionalString(value.medicalNotes),

      emergencyContactName: this.cleanOptionalString(value.emergencyContactName),
      emergencyContactRelationship: this.cleanOptionalString(value.emergencyContactRelationship),
      emergencyContactPhone: this.cleanOptionalString(value.emergencyContactPhone),
      emergencyContactPhone2: this.cleanOptionalString(value.emergencyContactPhone2),

      photoConsent: value.photoConsent ?? false,
      mediaConsent: value.mediaConsent ?? false,
      rulesAccepted: value.rulesAccepted ?? false
    }) as CreateStudentPayload;

    const wasEditing = !!this.editingStudentId();
    const request = wasEditing
      ? this.studentsService.update(this.editingStudentId()!, payload)
      : this.studentsService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadStudents();
        this.setAlert('success', wasEditing ? 'Alumno actualizado correctamente.' : 'Alumno creado correctamente.');
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo guardar el alumno.'));
      }
    });
  }

  getTotalPaid(student: Student | null): number {
    if (!student?.payments?.length) {
      return 0;
    }

    return student.payments.reduce((total, payment) => {
      return total + Number(payment.amount || 0);
    }, 0);
  }

  getAvailableCredits(student: Student | null): number {
    if (!student?.memberships?.length) {
      return 0;
    }

    return student.memberships.reduce((total, membership) => {
      return total + Number(membership.availableCredits || 0);
    }, 0);
  }

  getActiveMemberships(student: Student | null): number {
    if (!student?.memberships?.length) {
      return 0;
    }

    const now = new Date();

    return student.memberships.filter((membership) => {
      return Number(membership.availableCredits || 0) > 0
        && new Date(membership.expirationDate) >= now;
    }).length;
  }

  getStudentStatusLabel(student: Student | null): string {
    const credits = this.getAvailableCredits(student);

    if (!student?.enrolled) {
      return 'Sin inscripción activa';
    }

    if (credits <= 0) {
      return 'Sin créditos disponibles';
    }

    return `${credits} créditos disponibles`;
  }

  getStudentStatusClass(student: Student | null): string {
    const credits = this.getAvailableCredits(student);

    if (!student?.enrolled || credits <= 0) {
      return 'danger';
    }

    if (credits <= 2) {
      return 'warning';
    }

    return 'success';
  }

  getStudentTimeline(student: Student | null): any[] {
    if (!student) {
      return [];
    }

    const items: any[] = [];

    for (const membership of student.memberships || []) {
      items.push({
        date: membership.createdAt,
        icon: '💳',
        title: 'Compra de membresía',
        description: `${membership.package?.name || 'Paquete'} · ${membership.initialCredits} crédito(s)`,
        type: 'purchase'
      });

      if (membership.status === 'CANCELLED') {
        items.push({
          date: membership.cancelledAt || membership.createdAt,
          icon: '🚫',
          title: 'Membresía cancelada',
          description: membership.cancellationReason || 'Cancelación manual',
          type: 'cancelled'
        });
      }

      for (const transaction of membership.transactions || []) {
        if (transaction.type === 'CLASS_USE') {
          items.push({
            date: transaction.createdAt,
            icon: '➖',
            title: 'Crédito descontado',
            description: transaction.description || 'Uso de crédito en clase',
            type: 'credit'
          });
        }

        if (transaction.type === 'CANCELLATION') {
          items.push({
            date: transaction.createdAt,
            icon: '🚫',
            title: 'Ajuste por cancelación',
            description: transaction.description || 'Créditos cancelados',
            type: 'cancelled'
          });
        }
      }
    }

    for (const payment of student.payments || []) {
      items.push({
        date: payment.createdAt,
        icon: '💰',
        title: `Pago registrado: $${payment.amount}`,
        description: payment.notes || payment.concept || 'Pago',
        type: 'payment'
      });
    }

    for (const reservation of student.reservations || []) {
      items.push({
        date: reservation.createdAt,
        icon: reservation.status === 'ATTENDED' ? '✅' : '📅',
        title: reservation.status === 'ATTENDED'
          ? 'Clase asistida'
          : 'Reservación creada',
        description: `${reservation.class?.course?.name || 'Clase'} · ${reservation.status}`,
        type: reservation.status === 'ATTENDED' ? 'attendance' : 'reservation'
      });
    }

    items.push({
      date: student.createdAt,
      icon: '👤',
      title: 'Alumno registrado',
      description: 'Se creó el expediente del alumno',
      type: 'student'
    });

    return items
      .filter(item => !!item.date)
      .sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
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

  deleteStudent(student: Student): void {
    const confirmed = confirm(
      `¿Eliminar al alumno ${student.name}? También se eliminará su información relacionada.`
    );

    if (!confirmed) {
      return;
    }

    this.clearAlert();

    this.studentsService
      .delete(student.id)
      .subscribe({
        next: () => {
          this.selectedStudent.set(null);
          this.loadStudents();
          this.setAlert('success', 'Alumno eliminado correctamente.');
        },
        error: (err) => {
          console.error(err);
          this.setAlert('error', this.getApiErrorMessage(err, 'No se pudo eliminar el alumno.'));
        }
      });
  }

  private setAlert(type: AlertType, message: string): void {
    this.alert.set({ type, message });
  }

  private clearAlert(): void {
    this.alert.set(null);
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message
        .map((item) => this.formatApiMessage(item))
        .filter(Boolean)
        .join(' ');
    }

    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (typeof error?.error === 'string' && error.error.trim()) {
      return error.error;
    }

    const status = error?.status;
    const statusText = error?.statusText;
    const url = error?.url;

    if (status === 0) {
      return `${fallback} No hubo respuesta del servidor. Verifica que la API esté encendida en http://localhost:3004.`;
    }

    if (status) {
      return `${fallback} Código ${status}${statusText ? `: ${statusText}` : ''}${url ? ` · ${url}` : ''}`;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return `${fallback} Detalle: ${error.message}`;
    }

    return fallback;
  }

  private cleanRequiredString(value: unknown): string {
    return String(value ?? '').trim();
  }

  private cleanOptionalString(value: unknown): string | undefined {
    const text = String(value ?? '').trim();
    return text ? text : undefined;
  }

  private cleanPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
    return Object.entries(payload).reduce<Partial<T>>((cleaned, [key, value]) => {
      if (value === undefined || value === '') {
        return cleaned;
      }

      cleaned[key as keyof T] = value as T[keyof T];
      return cleaned;
    }, {});
  }

  private formatApiMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    if (message && typeof message === 'object') {
      return Object.values(message as Record<string, unknown>)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .join(' ');
    }

    return '';
  }

  openStudentFromQuery(): void {
    const studentId = this.route.snapshot.queryParamMap.get('studentId');

    if (!studentId) {
      return;
    }

    const student = this.students().find((item) => item.id === studentId);

    if (student) {
      this.openDetail(student);
    }
  }

  openStudentFromRoute(): void {
    const studentId =
      this.route.snapshot.paramMap.get('id') ||
      this.route.snapshot.queryParamMap.get('studentId');

    if (!studentId) {
      return;
    }

    const student = this.students().find((item) => item.id === studentId);

    if (student) {
      this.selectedStudent.set(student);
    }
  }

  getCurrentMembership(student: Student | null): any | null {
    if (!student?.memberships?.length) {
      return null;
    }

    const now = new Date();

    return student.memberships.find((membership) => {
      return (!membership.status || membership.status === 'ACTIVE')
        && Number(membership.availableCredits || 0) > 0
        && new Date(membership.expirationDate) >= now;
    }) || null;
  }

  getCurrentMembershipByArea(student: Student | null, area: 'DANCE' | 'MUSIC'): any | null {
    if (!student?.memberships?.length) {
      return null;
    }

    const now = new Date();

    return student.memberships.find((membership: any) => {
      return (!membership.status || membership.status === 'ACTIVE')
        && Number(membership.availableCredits || 0) > 0
        && new Date(membership.expirationDate) >= now
        && membership.package?.area === area;
    }) || null;
  }

  getAvailableCreditsByArea(student: Student | null, area: 'DANCE' | 'MUSIC'): number {
    if (!student?.memberships?.length) {
      return 0;
    }

    return student.memberships.reduce((total: number, membership: any) => {
      return membership.package?.area === area
        ? total + Number(membership.availableCredits || 0)
        : total;
    }, 0);
  }

  getAreaLabel(area?: string | null): string {
    return area === 'MUSIC' ? 'Música' : 'Danza';
  }

  getAreaMembershipSummary(student: Student | null, area: 'DANCE' | 'MUSIC'): string {
    const membership = this.getCurrentMembershipByArea(student, area);

    if (!membership) {
      return `Sin membresía ${this.getAreaLabel(area)} activa`;
    }

    return `${membership.package?.name || 'Membresía'} · ${membership.availableCredits} crédito(s)`;
  }

  getCurrentMembershipName(student: Student | null): string {
    return this.getCurrentMembership(student)?.package?.name || 'Sin membresía';
  }

  getCurrentMembershipExpiration(student: Student | null): string {
    const membership = this.getCurrentMembership(student);

    if (!membership) {
      return 'Sin vigencia';
    }

    return `Vence: ${this.formatDate(membership.expirationDate)}`;
  }

  getCreditsCardClass(student: Student | null): string {
    const credits = this.getAvailableCredits(student);

    if (credits <= 0) {
      return 'credits-card danger';
    }

    if (credits <= 2) {
      return 'credits-card warning';
    }

    return 'credits-card success';
  }


  getCreditExpirationDate(student: Student | null): string {
    if (!student?.memberships?.length) {
      return 'Sin créditos activos';
    }

    const activeMemberships = student.memberships
      .filter((membership: any) => Number(membership.availableCredits || 0) > 0 && membership.status !== 'CANCELLED')
      .sort((a: any, b: any) => new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime());

    if (!activeMemberships.length) {
      return 'Sin créditos activos';
    }

    return this.formatReadableDate(activeMemberships[0].expirationDate);
  }

  getEnrollmentExpirationDate(student: Student | null): string {
    if (!student?.enrollmentExpiresAt) {
      return student?.enrolled ? 'Vigente sin fecha registrada' : 'No inscrito';
    }

    return this.formatReadableDate(student.enrollmentExpiresAt);
  }

  getExpirationStatusClass(value: string | null | undefined): string {
    if (!value) {
      return 'expired';
    }

    const today = new Date();
    const date = new Date(value);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) {
      return 'expired';
    }

    if (diffDays <= 7) {
      return 'warning';
    }

    return 'active';
  }

  getDaysRemainingText(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    const today = new Date();
    const date = new Date(value);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

    if (diffDays < 0) {
      return `Venció hace ${Math.abs(diffDays)} día(s)`;
    }

    if (diffDays === 0) {
      return 'Vence hoy';
    }

    return `Vence en ${diffDays} día(s)`;
  }

  formatReadableDate(value: string | null | undefined): string {
    if (!value) {
      return 'Sin fecha';
    }

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }



  getSelectedStudentCreditExpirationRaw(): string | null {
    const student = this.selectedStudent();

    if (!student?.memberships?.length) {
      return null;
    }

    const activeMemberships = student.memberships
      .filter((membership: any) => Number(membership.availableCredits || 0) > 0 && membership.status !== 'CANCELLED')
      .sort((a: any, b: any) => new Date(b.expirationDate).getTime() - new Date(a.expirationDate).getTime());

    return activeMemberships[0]?.expirationDate || null;
  }


}
