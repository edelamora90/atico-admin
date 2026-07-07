import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import {
  Student,
  StudentsService
} from '../../core/services/students.service';

import {
  AticoPackage,
  PackagesService
} from '../../core/services/packages.service';

import {
  MembershipsService
} from '../../core/services/memberships.service';

type PackageAreaFilter = 'DANCE' | 'MUSIC';

@Component({
  selector: 'app-memberships',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './memberships.component.html',
  styleUrl: './memberships.component.scss'
})
export class MembershipsComponent implements OnInit {

  private studentsService = inject(StudentsService);

  private packagesService = inject(PackagesService);

  private membershipsService = inject(MembershipsService);

  private route = inject(ActivatedRoute);

  students = signal<Student[]>([]);

  packages = signal<AticoPackage[]>([]);
  packageAreaFilter = signal<PackageAreaFilter>('DANCE');

  memberships = signal<any[]>([]);

  loading = signal(true);

  saving = signal(false);

  search = signal('');

  selectedStudentId = signal('');

  selectedPackageId = signal('');

  message = signal('');
  infoMessage = signal('');

  filteredStudents = computed(() => {
    const term = this.search().toLowerCase().trim();

    if (!term) {
      return this.students();
    }

    return this.students().filter((student) => {
      return student.name.toLowerCase().includes(term)
        || (student.phone || '').includes(term)
        || (student.email || '').toLowerCase().includes(term);
    });
  });

  ngOnInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.loading.set(true);

    this.studentsService.getAll().subscribe({
      next: (students) => {
        this.students.set(students);

        const studentId = this.route.snapshot.queryParamMap.get('studentId');

        if (studentId) {
          this.selectedStudentId.set(studentId);
          this.syncPackageAreaFilterForStudent(
            students.find((student) => student.id === studentId) || null
          );
        }

        this.loadPackages();
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  loadPackages(): void {
    this.packagesService.getAll().subscribe({
      next: (packages) => {
        this.packages.set(packages);
        this.loadMemberships();
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  loadMemberships(): void {
    this.membershipsService.getAll().subscribe({
      next: (memberships) => {
        this.memberships.set(memberships);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  selectStudent(student: Student): void {
    this.selectedStudentId.set(student.id);
    this.syncPackageAreaFilterForStudent(student);
    this.selectedPackageId.set('');
    this.message.set('');
  }

  selectPackage(item: AticoPackage): void {
    if (item.area !== 'DANCE' && item.area !== 'MUSIC') {
      this.message.set('Este paquete no tiene un área válida para compra.');
      return;
    }

    const student = this.getSelectedStudent();

    this.selectedPackageId.set(item.id);
    this.message.set(this.getAdditionalPackageMessage(student, item.area));
  }

  getSelectedStudent(): Student | null {
    return this.students().find(
      student => student.id === this.selectedStudentId()
    ) || null;
  }

  getSelectedPackage(): AticoPackage | null {
    return this.getFilteredPackages().find(
      item => item.id === this.selectedPackageId()
    ) || null;
  }

  getCredits(student: Student): number {
    return student.memberships?.reduce((total, membership) => {
      return total + Number(membership.availableCredits || 0);
    }, 0) || 0;
  }

  buyPackage(): void {
    if (!this.selectedStudentId() || !this.selectedPackageId()) {
      this.message.set('Selecciona un alumno y un paquete.');
      return;
    }

    const student = this.getSelectedStudent();
    const selectedPackage = this.getSelectedPackage();

    this.saving.set(true);
    this.message.set('');

    this.membershipsService.create({
      studentId: this.selectedStudentId(),
      packageId: this.selectedPackageId()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Paquete comprado correctamente. Créditos y pago generados.');
        this.selectedPackageId.set('');
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.message.set(err?.error?.message || 'No se pudo comprar el paquete.');
      }
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

  cancelMembership(item: any): void {
    if (item.status === 'CANCELLED') {
      this.message.set('Esta membresía ya está cancelada.');
      return;
    }

    const reason = prompt(
      `Motivo de cancelación para la membresía de ${item.student?.name || 'este alumno'}:`
    );

    if (reason === null) {
      return;
    }

    const confirmed = confirm(
      `¿Cancelar la membresía "${item.package?.name}" de ${item.student?.name}? Los créditos disponibles pasarán a 0.`
    );

    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.message.set('');

    this.membershipsService
      .cancel(item.id, reason || 'Cancelación manual')
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.set('Membresía cancelada correctamente.');
          this.loadAll();
        },
        error: (err) => {
          console.error(err);
          this.saving.set(false);
          this.message.set(
            err?.error?.message || 'No se pudo cancelar la membresía.'
          );
        }
      });
  }

  getMembershipStatusLabel(item: any): string {
    if (item.status === 'CANCELLED') {
      return 'Cancelada';
    }

    if (new Date(item.expirationDate) < new Date()) {
      return 'Vencida';
    }

    if (Number(item.availableCredits || 0) <= 0) {
      return 'Agotada';
    }

    return 'Activa';
  }

  getMembershipStatusClass(item: any): string {
    if (item.status === 'CANCELLED') {
      return 'cancelled';
    }

    if (new Date(item.expirationDate) < new Date()) {
      return 'expired';
    }

    if (Number(item.availableCredits || 0) <= 0) {
      return 'empty';
    }

    return 'active';
  }


  getAvailablePackages(): AticoPackage[] {
    const student = this.getSelectedStudent();
    const packages = this.getFilteredPackages();

    if (!student) {
      return packages;
    }

    return packages.filter((item) => {
      const type = item.type || 'PACKAGE';

      if (type === 'TRIAL') {
        return !student.trialClassUsed;
      }

      if (type === 'DAY_PASS') {
        return true;
      }

      if (item.includesFreeInscription && student.studentContinuity?.requiresInitialInscription) {
        return true;
      }

      if (student.studentContinuity?.requiresInitialInscription) {
        return false;
      }

      return true;
    });
  }

  hasActiveMembershipForArea(student: Student | null, area?: string): boolean {
    if (!student || (area !== 'DANCE' && area !== 'MUSIC')) {
      return false;
    }

    const now = Date.now();

    return student.memberships?.some((membership: any) => {
      const expirationDate = membership.expirationDate
        ? new Date(membership.expirationDate).getTime()
        : 0;

      return membership.status === 'ACTIVE'
        && Number(membership.availableCredits || 0) > 0
        && expirationDate >= now
        && membership.package?.area === area;
    }) || false;
  }

  getCreditsByArea(student: Student | null, area: PackageAreaFilter): number {
    if (!student) {
      return 0;
    }

    return student.memberships?.reduce((total, membership: any) => {
      return membership.package?.area === area
        ? total + Number(membership.availableCredits || 0)
        : total;
    }, 0) || 0;
  }

  getActivePackageCountByArea(student: Student | null, area: PackageAreaFilter): number {
    if (!student) {
      return 0;
    }

    const now = Date.now();

    return student.memberships?.filter((membership: any) => {
      const expirationDate = membership.expirationDate
        ? new Date(membership.expirationDate).getTime()
        : 0;

      return membership.status === 'ACTIVE'
        && expirationDate >= now
        && membership.package?.area === area;
    }).length || 0;
  }

  getAdditionalPackageMessage(student: Student | null, area?: string): string {
    if (!student || (area !== 'DANCE' && area !== 'MUSIC')) {
      return '';
    }

    if (!this.hasActiveMembershipForArea(student, area)) {
      return '';
    }

    return `El alumno ya tiene paquetes activos de ${this.getPackageAreaLabel(area)}. Este paquete se agregará como adicional.`;
  }

  getStudentEnrollmentLabel(student: Student | null): string {
    if (!student) {
      return 'Selecciona un alumno';
    }

    const status = student.studentContinuity?.continuityStatus;

    if (status === 'ACTIVE') return 'Activo';
    if (status === 'GRACE_PERIOD') return `En periodo de gracia hasta ${this.formatDate(student.studentContinuity?.graceUntil)}`;
    if (status === 'INSCRIBED_NO_MEMBERSHIP') return 'Inscrito sin paquete';
    if (status === 'EXPIRED_NEEDS_RENEWAL') return 'Requiere renovación';
    if (status === 'NEW_NEEDS_INSCRIPTION') return 'Requiere inscripción inicial';

    return student.enrolled ? 'Inscrito' : 'No inscrito';
  }

  getStudentEnrollmentClass(student: Student | null): string {
    if (!student) {
      return 'neutral';
    }

    if (student.studentContinuity?.isCurrentlyEnrolled) {
      return 'active';
    }

    return 'pending';
  }

  getAcademicAreaLabel(student: Student | null): string {
    const area = student?.academicArea;

    if (area === 'MUSIC') return 'Música';
    if (area === 'BOTH') return 'Área no definida';

    return 'Danza';
  }

  setPackageAreaFilter(area: PackageAreaFilter): void {
    this.packageAreaFilter.set(area);
    this.selectedPackageId.set('');
  }

  getFilteredPackages(): AticoPackage[] {
    return this.packages().filter((item) => item.area === this.packageAreaFilter());
  }

  getPackageAreaCount(area: PackageAreaFilter): number {
    return this.packages().filter((item) => item.area === area).length;
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

  private syncPackageAreaFilterForStudent(student: Student | null): void {
    if (student?.academicArea === 'MUSIC') {
      this.packageAreaFilter.set('MUSIC');
      this.infoMessage.set('');
      return;
    }

    this.packageAreaFilter.set('DANCE');

    if (student?.academicArea === 'BOTH') {
      this.infoMessage.set('El alumno tiene un área anterior no permitida. Se muestran paquetes de Danza por defecto.');
      return;
    }

    this.infoMessage.set('');
  }

  getInscriptionAmount(student: Student | null): number {
    if (!student) {
      return 0;
    }

    if (student.academicArea === 'MUSIC') {
      return 250;
    }

    if (student.academicArea === 'BOTH') {
      return 450;
    }

    return 200;
  }

  getRenewalAmount(student: Student | null): number {
    return Number(student?.studentContinuity?.renewalFeeAmount || 0);
  }

  getSelectedSaleTotal(): number {
    const selectedPackage = this.getSelectedPackage();
    const student = this.getSelectedStudent();

    return Number(selectedPackage?.price || 0) +
      (student?.studentContinuity?.requiresRenewal
        ? this.getRenewalAmount(student)
        : 0);
  }

  getPackageTypeLabel(item: AticoPackage | null): string {
    if (!item) return '-';
    if (item.type === 'PROMOTION') return 'Promoción';
    if (item.type === 'TRIAL') return 'Clase muestra';
    if (item.type === 'DAY_PASS') return 'Day Pass';
    return 'Paquete';
  }

  getPackageTypeClass(item: AticoPackage): string {
    if (item.type === 'PROMOTION') return 'promotion-package';
    if (item.type === 'TRIAL') return 'trial-package';
    if (item.type === 'DAY_PASS') return 'daypass-package';
    return 'normal-package';
  }

  payInscription(): void {
    const student = this.getSelectedStudent();

    if (!student) {
      this.message.set('Selecciona un alumno.');
      return;
    }

    if (!student.studentContinuity?.requiresInitialInscription) {
      this.message.set('El alumno no requiere inscripción inicial.');
      return;
    }

    const confirmed = confirm(
      `¿Cobrar inscripción de ${student.name}?`
    );

    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.message.set('');

    this.studentsService.payInscription(student.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.set('Inscripción cobrada correctamente.');
        this.loadAll();
      },
      error: (err) => {
        console.error(err);
        this.saving.set(false);
        this.message.set(err?.error?.message || 'No se pudo cobrar la inscripción.');
      }
    });
  }


}
