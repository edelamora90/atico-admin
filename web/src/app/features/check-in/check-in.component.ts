import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';

import {
  AticoClass,
  ClassesService,
} from '../../core/services/classes.service';

import {
  Student,
  StudentsService,
} from '../../core/services/students.service';

type AlertType = 'success' | 'error' | 'warning' | 'info';
type ClassStatus = 'upcoming' | 'active' | 'finished' | 'full';
type StudentStatus = 'attended' | 'reserved' | 'credits' | 'no-credits' | 'full' | 'blocked';
type ClassArea = 'DANCE' | 'MUSIC';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-check-in',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './check-in.component.html',
  styleUrl: './check-in.component.scss',
})
export class CheckInComponent implements OnInit {
  private classesService = inject(ClassesService);
  private studentsService = inject(StudentsService);

  classes = signal<AticoClass[]>([]);
  students = signal<Student[]>([]);
  loading = signal(false);
  savingStudentId = signal<string | null>(null);
  selectedClass = signal<AticoClass | null>(null);
  searchTerm = signal('');
  alert = signal<UiAlert | null>(null);

  todayLabel = computed(() => {
    return new Date().toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const selectedId = this.selectedClass()?.id || null;

    this.loading.set(true);

    forkJoin({
      classes: this.classesService.getAll(),
      students: this.studentsService.getAll(),
    }).subscribe({
      next: ({ classes, students }) => {
        this.classes.set(classes);
        this.students.set(students);
        this.refreshSelectedClassAfterReload(selectedId);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.alert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo cargar la información de check-in.'),
        });
      },
    });
  }

  getTodayClasses(): AticoClass[] {
    return this.classes()
      .filter((classItem) => {
        return classItem.type !== 'RENTAL' && this.isToday(classItem.startDate);
      })
      .sort((a, b) => {
        return this.getDateTime(a.startDate) - this.getDateTime(b.startDate);
      });
  }

  selectClass(classItem: AticoClass): void {
    this.selectedClass.set(classItem);
    this.alert.set(null);
  }

  getFilteredStudents(): Student[] {
    const term = this.normalizeText(this.searchTerm());
    const students = this.students();

    if (!term) {
      return students.slice(0, 30);
    }

    return students
      .filter((student) => {
        const haystack = this.normalizeText(`${student.name} ${student.phone || ''}`);
        return haystack.includes(term);
      })
      .slice(0, 30);
  }

  checkInStudent(student: Student): void {
    const classItem = this.selectedClass();

    if (!classItem || this.savingStudentId()) {
      return;
    }

    if (!this.isCheckInWindowOpen(classItem)) {
      this.alert.set({
        type: 'warning',
        message: this.getCheckInWindowMessage(classItem),
      });
      return;
    }

    this.savingStudentId.set(student.id);
    this.alert.set(null);

    this.classesService.checkIn(classItem.id, student.id).subscribe({
      next: (response) => {
        this.savingStudentId.set(null);
        this.alert.set({
          type: 'success',
          message: response.message || 'Check-in registrado correctamente.',
        });

        if (response.class) {
          this.selectedClass.set(response.class);
          this.classes.update((classes) => {
            return classes.map((item) => item.id === response.class.id ? response.class : item);
          });
        }

        if (response.student) {
          this.updateStudentLocally(response.student);
        }

        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.savingStudentId.set(null);
        this.alert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo registrar el check-in.'),
        });
      },
    });
  }

  refreshSelectedClassAfterReload(classId: string | null): void {
    if (!classId) {
      return;
    }

    const refreshedClass = this.classes().find((classItem) => classItem.id === classId) || null;
    this.selectedClass.set(refreshedClass);
  }

  isToday(value: string): boolean {
    const date = new Date(value);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  formatTimeRange(classItem: AticoClass): string {
    const start = this.formatTime(classItem.startDate);
    const end = classItem.endDate ? this.formatTime(classItem.endDate) : 'Sin término';

    return `${start} - ${end}`;
  }

  getClassStatus(classItem: AticoClass): { label: string; className: ClassStatus } {
    const now = Date.now();
    const start = this.getDateTime(classItem.startDate);
    const end = this.getDateTime(classItem.endDate || classItem.startDate);

    if (end < now) {
      return { label: 'Finalizada', className: 'finished' };
    }

    if (this.getAvailableSpots(classItem) <= 0) {
      return { label: 'Llena', className: 'full' };
    }

    if (start <= now && now <= end) {
      return { label: 'En curso', className: 'active' };
    }

    return { label: 'Próxima', className: 'upcoming' };
  }

  getAttendanceCount(classItem: AticoClass | null): number {
    if (!classItem) {
      return 0;
    }

    const studentIds = new Set<string>();

    for (const attendance of classItem.attendances || []) {
      const studentId = attendance.studentId || attendance.student?.id;

      if (studentId && attendance.status === 'PRESENT') {
        studentIds.add(studentId);
      }
    }

    for (const reservation of classItem.reservations || []) {
      const studentId = reservation.studentId || reservation.student?.id;

      if (studentId && reservation.status === 'ATTENDED') {
        studentIds.add(studentId);
      }
    }

    return studentIds.size;
  }

  getActiveReservationCount(classItem: AticoClass | null): number {
    if (!classItem) {
      return 0;
    }

    return classItem.reservations?.filter((reservation: any) => {
      return ['RESERVED', 'CONFIRMED', 'ATTENDED'].includes(reservation.status);
    }).length || 0;
  }

  getPendingReservationCount(classItem: AticoClass | null): number {
    if (!classItem) {
      return 0;
    }

    const attendedStudentIds = new Set<string>();

    for (const attendance of classItem.attendances || []) {
      const studentId = attendance.studentId || attendance.student?.id;

      if (studentId && attendance.status === 'PRESENT') {
        attendedStudentIds.add(studentId);
      }
    }

    return classItem.reservations?.filter((reservation: any) => {
      const studentId = reservation.studentId || reservation.student?.id;
      return ['RESERVED', 'CONFIRMED'].includes(reservation.status) && !attendedStudentIds.has(studentId);
    }).length || 0;
  }

  getAvailableSpots(classItem: AticoClass): number {
    return Math.max(Number(classItem.capacity || 0) - this.getActiveReservationCount(classItem), 0);
  }

  getStudentCredits(student: Student, area = this.selectedClass()?.area): number {
    const now = Date.now();
    const targetArea = this.getOperationalArea(area);

    return student.memberships?.reduce((total, membership: any) => {
      const expirationDate = membership.expirationDate ? new Date(membership.expirationDate).getTime() : 0;
      const isActive =
        membership.status === 'ACTIVE' &&
        Number(membership.availableCredits || 0) > 0 &&
        expirationDate >= now &&
        membership.package?.area === targetArea;

      return isActive ? total + Number(membership.availableCredits || 0) : total;
    }, 0) || 0;
  }

  hasStudentAttendance(classItem: AticoClass, student: Student): boolean {
    const hasAttendance = !!classItem.attendances?.some((attendance: any) => {
      const studentId = attendance.studentId || attendance.student?.id;
      return studentId === student.id && attendance.status === 'PRESENT';
    });

    const hasAttendedReservation = !!classItem.reservations?.some((reservation: any) => {
      const studentId = reservation.studentId || reservation.student?.id;
      return studentId === student.id && reservation.status === 'ATTENDED';
    });

    return hasAttendance || hasAttendedReservation;
  }

  hasStudentActiveReservation(classItem: AticoClass, student: Student): boolean {
    return !!classItem.reservations?.some((reservation: any) => {
      const studentId = reservation.studentId || reservation.student?.id;
      return studentId === student.id && ['RESERVED', 'CONFIRMED'].includes(reservation.status);
    });
  }

  canCheckInStudent(classItem: AticoClass, student: Student): boolean {
    if (!this.isCheckInWindowOpen(classItem)) {
      return false;
    }

    if (this.isStudentBlocked(student)) {
      return false;
    }

    if (this.hasStudentAttendance(classItem, student)) {
      return false;
    }

    const hasReservation = this.hasStudentActiveReservation(classItem, student);
    const hasCredits = this.getStudentCredits(student, classItem.area) > 0;

    if (!hasReservation && !hasCredits) {
      return false;
    }

    if (!hasReservation && this.getAvailableSpots(classItem) <= 0) {
      return false;
    }

    return true;
  }

  getStudentStatusLabel(classItem: AticoClass, student: Student): string {
    if (this.hasStudentAttendance(classItem, student)) return 'Ya registrado';
    if (!this.isCheckInWindowOpen(classItem)) return 'Fuera de horario';
    if (this.isStudentBlocked(student)) return student.status === 'BLOQUEADO' ? 'Bloqueado' : 'Inactivo';
    if (this.hasStudentActiveReservation(classItem, student)) return 'Reservado';
    if (this.getStudentCredits(student, classItem.area) <= 0) return `Sin créditos ${this.getAreaLabel(classItem.area)}`;
    if (this.getAvailableSpots(classItem) <= 0) return 'Sin cupo';
    return 'Con créditos';
  }

  getStudentStatusClass(classItem: AticoClass, student: Student): StudentStatus {
    if (this.hasStudentAttendance(classItem, student)) return 'attended';
    if (!this.isCheckInWindowOpen(classItem)) return 'full';
    if (this.isStudentBlocked(student)) return 'blocked';
    if (this.hasStudentActiveReservation(classItem, student)) return 'reserved';
    if (this.getStudentCredits(student, classItem.area) <= 0) return 'no-credits';
    if (this.getAvailableSpots(classItem) <= 0) return 'full';
    return 'credits';
  }

  getStudentButtonText(classItem: AticoClass, student: Student): string {
    if (this.savingStudentId() === student.id) return 'Registrando...';
    if (this.hasStudentAttendance(classItem, student)) return 'Ya registrado';
    if (!this.isCheckInWindowOpen(classItem)) return 'Fuera de horario';
    if (this.isStudentBlocked(student)) return student.status === 'BLOQUEADO' ? 'Bloqueado' : 'Inactivo';
    if (this.getStudentCredits(student, classItem.area) <= 0 && !this.hasStudentActiveReservation(classItem, student)) return 'Sin créditos';
    if (this.getAvailableSpots(classItem) <= 0 && !this.hasStudentActiveReservation(classItem, student)) return 'Sin cupo';
    return 'Registrar';
  }

  getClassTitle(classItem: AticoClass): string {
    return classItem.title || classItem.course?.name || 'Sin nombre';
  }

  getAreaLabel(area?: string | null): string {
    return area === 'MUSIC' ? 'Música' : 'Danza';
  }

  getAreaClass(area?: string | null): string {
    return area === 'MUSIC' ? 'music' : 'dance';
  }

  getCapacityLabel(classItem: AticoClass | null): string {
    if (!classItem) {
      return '0/0';
    }

    return `${this.getActiveReservationCount(classItem)}/${classItem.capacity}`;
  }

  isCheckInWindowOpen(classItem: AticoClass | null): boolean {
    if (!classItem) {
      return false;
    }

    const now = Date.now();
    const window = this.getCheckInWindow(classItem);

    return now >= window.start.getTime() && now <= window.end.getTime();
  }

  getCheckInWindowMessage(classItem: AticoClass): string {
    const window = this.getCheckInWindow(classItem);

    return `El check-in solo está disponible de ${this.formatTimeFromDate(
      window.start,
    )} a ${this.formatTimeFromDate(window.end)}.`;
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message || error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return typeof message === 'string' && message.trim()
      ? message
      : fallback;
  }

  private updateStudentLocally(updatedStudent: Student): void {
    this.students.update((students) => {
      return students.map((student) => student.id === updatedStudent.id ? updatedStudent : student);
    });
  }

  private getDateTime(value: string): number {
    return new Date(value).getTime();
  }

  private getCheckInWindow(classItem: AticoClass): { start: Date; end: Date } {
    const start = new Date(classItem.startDate);
    start.setMinutes(start.getMinutes() - 30);

    const end = new Date(classItem.startDate);
    end.setMinutes(end.getMinutes() + 20);

    return { start, end };
  }

  private formatTime(value: string): string {
    return this.formatTimeFromDate(new Date(value));
  }

  private formatTimeFromDate(value: Date): string {
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private isStudentBlocked(student: Student): boolean {
    return student.status === 'INACTIVO' || student.status === 'BLOQUEADO';
  }

  private getOperationalArea(area?: string | null): ClassArea {
    return area === 'MUSIC' ? 'MUSIC' : 'DANCE';
  }
}
