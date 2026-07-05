import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  AticoClass,
  ClassesService
} from '../../core/services/classes.service';

import {
  Teacher,
  TeachersService
} from '../../core/services/teachers.service';

import {
  Room,
  RoomsService
} from '../../core/services/rooms.service';

import {
  Student,
  StudentsService
} from '../../core/services/students.service';

import { ReservationsService } from '../../core/services/reservations.service';
import { AttendancesService } from '../../core/services/attendances.service';
import { AuthService } from '../../core/auth/auth.service';

type AlertType = 'success' | 'error' | 'warning' | 'info';
type ClassFilter = 'TODAY' | 'UPCOMING' | 'ALL' | 'PAST';
type ClassArea = 'DANCE' | 'MUSIC';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './classes.component.html',
  styleUrl: './classes.component.scss'
})
export class ClassesComponent implements OnInit {

  private classesService = inject(ClassesService);
  private teachersService = inject(TeachersService);
  private roomsService = inject(RoomsService);
  private studentsService = inject(StudentsService);
  private reservationsService = inject(ReservationsService);
  private attendancesService = inject(AttendancesService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  classes = signal<AticoClass[]>([]);
  teachers = signal<Teacher[]>([]);
  rooms = signal<Room[]>([]);
  students = signal<Student[]>([]);
  classFilter = signal<ClassFilter>('TODAY');

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  editingClassId = signal<string | null>(null);
  selectedClass = signal<AticoClass | null>(null);
  pageAlert = signal<UiAlert | null>(null);
  formAlert = signal<UiAlert | null>(null);

  showReservationForm = signal(false);
  reservationAlert = signal<UiAlert | null>(null);
  reservingStudentId = signal<string | null>(null);

  attendanceAlert = signal<UiAlert | null>(null);
  registeringAttendanceId = signal<string | null>(null);

  showCheckInDrawer = signal(false);
  selectedCheckInClass = signal<AticoClass | null>(null);
  checkInSearchTerm = signal('');
  checkInSaving = signal(false);
  checkInAlert = signal<UiAlert | null>(null);
  selectedCheckInStudent = signal<Student | null>(null);

  form = this.fb.group({
    type: ['CLASS', Validators.required],
    area: ['DANCE', Validators.required],
    title: ['', Validators.required],
    teacherId: [''],
    roomId: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    durationMinutes: [60, Validators.required],
    capacity: [25, Validators.required],
    teacherPaymentAmount: [0, Validators.required],
    rentalItemIds: [[] as string[]]
  });

  ngOnInit(): void {
    this.loadInitialData();

    this.form.get('roomId')?.valueChanges.subscribe(() => {
      this.form.patchValue({
        rentalItemIds: []
      });
      this.updateRentalTotal();
    });

    this.form.get('type')?.valueChanges.subscribe((type) => {
      if (type === 'RENTAL') {
        this.form.patchValue({
          teacherId: '',
          capacity: 1,
          teacherPaymentAmount: 0,
          rentalItemIds: []
        });
      }
    });
  }

  loadInitialData(): void {
    this.loading.set(true);

    this.classesService.getAll().subscribe({
      next: (classes) => {
        this.classes.set(classes);
        this.loadCatalogs();
      },
      error: (err) => {
        console.error(err);
        this.setPageAlert('error', this.getApiErrorMessage(err, 'No se pudieron cargar los eventos.'));
        this.loading.set(false);
      }
    });
  }

  loadCatalogs(): void {
    this.teachersService.getAll().subscribe({
      next: teachers => this.teachers.set(teachers),
    });

    this.roomsService.getAll().subscribe({
      next: rooms => this.rooms.set(rooms),
    });

    this.studentsService.getAll().subscribe({
      next: students => {
        this.students.set(students);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadClasses(): void {
    this.classesService.getAll().subscribe({
      next: data => {
        this.classes.set(data);
        this.refreshOpenClassReferences(data);
      },
      error: err => {
        console.error(err);
        this.setPageAlert('error', this.getApiErrorMessage(err, 'No se pudieron cargar los eventos.'));
      },
    });
  }

  setClassFilter(filter: ClassFilter): void {
    this.classFilter.set(filter);
  }

  getFilteredClasses(): AticoClass[] {
    const filter = this.classFilter();
    const classes = this.getClassListForFilters();

    if (filter === 'TODAY') {
      return classes
        .filter((item) => this.isToday(item.startDate))
        .sort((a, b) => this.getDateTime(a.startDate) - this.getDateTime(b.startDate));
    }

    if (filter === 'UPCOMING') {
      return classes
        .filter((item) => this.isUpcoming(item.startDate))
        .sort((a, b) => this.getDateTime(a.startDate) - this.getDateTime(b.startDate));
    }

    if (filter === 'PAST') {
      return classes
        .filter((item) => this.isPast(item.startDate))
        .sort((a, b) => this.getDateTime(b.startDate) - this.getDateTime(a.startDate));
    }

    return classes.sort((a, b) => this.getDateTime(a.startDate) - this.getDateTime(b.startDate));
  }

  getTodayClassesCount(): number {
    return this.getClassListForFilters().filter((item) => this.isToday(item.startDate)).length;
  }

  getUpcomingClassesCount(): number {
    return this.getClassListForFilters().filter((item) => this.isUpcoming(item.startDate)).length;
  }

  getPastClassesCount(): number {
    return this.getClassListForFilters().filter((item) => this.isPast(item.startDate)).length;
  }

  getAllClassesCount(): number {
    return this.getClassListForFilters().length;
  }

  getEmptyStateMessage(): string {
    if (this.classFilter() === 'TODAY') return 'No hay clases programadas para hoy.';
    if (this.classFilter() === 'UPCOMING') return 'No hay próximas clases programadas.';
    if (this.classFilter() === 'PAST') return 'No hay clases pasadas.';
    return 'No hay clases registradas.';
  }

  openCreateForm(): void {
    if (!this.canEditClasses()) {
      return;
    }

    this.clearPageAlert();
    this.clearFormAlert();
    this.editingClassId.set(null);
    this.form.reset({
      type: 'CLASS',
      area: 'DANCE',
      title: '',
      teacherId: '',
      roomId: '',
      startDate: '',
      endDate: '',
      durationMinutes: 60,
      capacity: 25,
      teacherPaymentAmount: 0,
      rentalItemIds: []
    }, { emitEvent: false });

    this.showForm.set(true);
  }

  openEditForm(item: AticoClass, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.canEditClasses()) {
      return;
    }

    this.clearPageAlert();
    this.clearFormAlert();
    this.editingClassId.set(item.id);
    this.form.reset({
      type: item.type,
      area: this.getOperationalArea(item.area),
      title: this.getClassTitle(item),
      teacherId: item.teacher?.id || '',
      roomId: item.room?.id || '',
      startDate: this.formatDateTimeInput(item.startDate),
      endDate: item.endDate ? this.formatDateTimeInput(item.endDate) : '',
      durationMinutes: item.durationMinutes || 60,
      capacity: item.capacity || 1,
      teacherPaymentAmount: Number(item.teacherPaymentAmount || 0),
      rentalItemIds: this.getRentalItemIds(item)
    }, { emitEvent: false });

    this.showForm.set(true);
  }

  closeCreateForm(): void {
    this.showForm.set(false);
    this.saving.set(false);
    this.editingClassId.set(null);
    this.clearFormAlert();
    this.form.reset({
      type: 'CLASS',
      area: 'DANCE',
      title: '',
      teacherId: '',
      roomId: '',
      startDate: '',
      endDate: '',
      durationMinutes: 60,
      capacity: 25,
      teacherPaymentAmount: 0,
      rentalItemIds: []
    }, { emitEvent: false });
  }

  isEditingClass(): boolean {
    return !!this.editingClassId();
  }

  canEditClasses(): boolean {
    return this.auth.hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  }

  isRentalForm(): boolean {
    return this.form.get('type')?.value === 'RENTAL';
  }

  getSelectedRoom() {
    const roomId = this.form.get('roomId')?.value;
    return this.rooms().find((room) => room.id === roomId) || null;
  }

  getSelectedRentalItemIds(): string[] {
    return this.form.get('rentalItemIds')?.value || [];
  }

  isRentalItemSelected(itemId: string): boolean {
    return this.getSelectedRentalItemIds().includes(itemId);
  }

  toggleRentalItem(itemId: string, checked: boolean): void {
    const current = this.getSelectedRentalItemIds();

    const next = checked
      ? Array.from(new Set([...current, itemId]))
      : current.filter((id) => id !== itemId);

    this.form.patchValue({
      rentalItemIds: next
    });

    this.updateRentalTotal();
  }

  updateRentalTotal(): void {
    const room = this.getSelectedRoom();

    if (!room || !this.isRentalForm()) {
      return;
    }

    const selectedIds = this.getSelectedRentalItemIds();

    const extrasTotal = room.items
      ?.filter((item) => selectedIds.includes(item.id))
      .reduce((sum, item) => sum + Number(item.price || 0), 0) || 0;

    const total = Number(room.basePrice || 0) + extrasTotal;

    this.form.patchValue({
      teacherPaymentAmount: total
    });
  }

  saveClass(): void {
    if (this.saving()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setFormAlert('warning', 'Completa los campos obligatorios.');
      return;
    }

    const raw = this.form.getRawValue();
    const type = (raw.type || 'CLASS') as 'CLASS' | 'COURSE' | 'WORKSHOP' | 'RENTAL';
    const area = this.getOperationalArea(raw.area);

    if (type !== 'RENTAL' && !raw.teacherId) {
      this.setFormAlert('warning', 'Selecciona docente.');
      return;
    }

    const start = new Date(raw.startDate || '');
    const end = new Date(raw.endDate || '');

    const durationMinutes = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 60000)
    );

    const payload = {
      type,
      area,
      title: raw.title || '',
      teacherId: raw.teacherId || null,
      roomId: raw.roomId || '',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationMinutes,
      capacity: Number(raw.capacity || 1),
      teacherPaymentAmount: Number(raw.teacherPaymentAmount || 0),
      rentalItemIds: raw.rentalItemIds || []
    };

    this.saving.set(true);
    this.clearPageAlert();
    this.clearFormAlert();

    const editingId = this.editingClassId();
    const request = editingId
      ? this.classesService.update(editingId, payload)
      : this.classesService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeCreateForm();
        this.loadClasses();
        this.setPageAlert(
          'success',
          editingId
            ? 'Evento actualizado correctamente.'
            : 'Evento creado correctamente.'
        );
      },
      error: err => {
        console.error(err);
        this.saving.set(false);
        this.setFormAlert(
          'error',
          this.getApiErrorMessage(
            err,
            editingId
              ? 'No se pudo actualizar el evento.'
              : 'No se pudo crear el evento.'
          )
        );
      }
    });
  }

  openDetail(item: AticoClass): void {
    this.selectedClass.set(item);
  }

  closeDetail(): void {
    this.selectedClass.set(null);
  }

  getClassTitle(item: AticoClass): string {
    return item.title || item.course?.name || 'Sin nombre';
  }

  getTypeLabel(item: AticoClass): string {
    if (item.type === 'COURSE') return 'Curso';
    if (item.type === 'WORKSHOP') return 'Taller';
    if (item.type === 'RENTAL') return 'Renta';
    return 'Clase';
  }

  getAreaLabel(area?: string | null): string {
    return area === 'MUSIC' ? 'Música' : 'Danza';
  }

  getAreaClass(area?: string | null): string {
    return area === 'MUSIC' ? 'music' : 'dance';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateTimeRange(item: AticoClass): string {
    const start = new Date(item.startDate).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });

    const end = item.endDate
      ? new Date(item.endDate).toLocaleString('es-MX', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'Sin término';

    return `${start} - ${end}`;
  }

  getReservedCount(item: AticoClass): number {
    return this.getActiveReservationCount(item);
  }

  getActiveReservationCount(item: AticoClass): number {
    return item.reservations?.filter((reservation: any) => {
      return ['RESERVED', 'CONFIRMED', 'ATTENDED'].includes(reservation.status);
    }).length || 0;
  }

  getAttendanceCount(item: AticoClass): number {
    const studentIds = new Set<string>();

    for (const attendance of item.attendances || []) {
      const studentId = attendance.studentId || attendance.student?.id;

      if (studentId && attendance.status === 'PRESENT') {
        studentIds.add(studentId);
      }
    }

    for (const reservation of item.reservations || []) {
      const studentId = reservation.studentId || reservation.student?.id;

      if (studentId && reservation.status === 'ATTENDED') {
        studentIds.add(studentId);
      }
    }

    return studentIds.size;
  }

  getTeacherPaymentTotal(item: AticoClass | null): number {
    if (!item) {
      return 0;
    }

    if (item.type === 'RENTAL') {
      return Number(item.teacherPaymentAmount || 0);
    }

    return Number(item.teacherPaymentSummary?.total || item.teacherPaymentTotal || 0);
  }

  getPaidAttendancesCount(item: AticoClass | null): number {
    if (!item || item.type === 'RENTAL') {
      return 0;
    }

    return Number(
      item.teacherPaymentSummary?.attendancesCount ||
      item.paidAttendancesCount ||
      0,
    );
  }

  getTeacherPaymentItems(item: AticoClass | null): any[] {
    return item?.teacherPaymentSummary?.items || [];
  }

  getPendingReservationCount(item: AticoClass): number {
    const attendedStudentIds = new Set(
      (item.attendances || [])
        .filter((attendance: any) => attendance.status === 'PRESENT')
        .map((attendance: any) => attendance.studentId || attendance.student?.id)
        .filter(Boolean)
    );

    return item.reservations?.filter((reservation: any) => {
      const studentId = reservation.studentId || reservation.student?.id;
      return ['RESERVED', 'CONFIRMED'].includes(reservation.status) && !attendedStudentIds.has(studentId);
    }).length || 0;
  }

  getAvailableSpots(item: AticoClass): number {
    return Math.max(item.capacity - this.getActiveReservationCount(item), 0);
  }

  getOccupancyPercent(item: AticoClass): number {
    if (!item.capacity) return 0;
    return Math.round((this.getActiveReservationCount(item) / item.capacity) * 100);
  }

  getCheckInAttendanceCount(item: AticoClass | null): number {
    return item ? this.getAttendanceCount(item) : 0;
  }

  getCheckInPendingCount(item: AticoClass | null): number {
    return item ? this.getPendingReservationCount(item) : 0;
  }

  getCheckInCapacityLabel(item: AticoClass | null): string {
    if (!item) {
      return '0/0';
    }

    return `${this.getActiveReservationCount(item)}/${item.capacity}`;
  }

  openCheckInDrawer(item: AticoClass, event?: MouseEvent): void {
    event?.stopPropagation();
    this.selectedCheckInClass.set(item);
    this.selectedCheckInStudent.set(null);
    this.checkInSearchTerm.set('');
    this.checkInAlert.set(null);
    this.showCheckInDrawer.set(true);
  }

  closeCheckInDrawer(): void {
    if (this.checkInSaving()) {
      return;
    }

    this.showCheckInDrawer.set(false);
    this.selectedCheckInClass.set(null);
    this.selectedCheckInStudent.set(null);
    this.checkInSearchTerm.set('');
    this.checkInAlert.set(null);
  }

  setCheckInSearchTerm(value: string): void {
    this.checkInSearchTerm.set(value);
  }

  getFilteredCheckInStudents(): Student[] {
    const term = this.normalizeText(this.checkInSearchTerm());
    const source = this.students();

    if (!term) {
      return source.slice(0, 20);
    }

    return source
      .filter((student) => {
        const haystack = this.normalizeText(`${student.name} ${student.phone || ''}`);
        return haystack.includes(term);
      })
      .slice(0, 20);
  }

  selectCheckInStudent(student: Student): void {
    this.selectedCheckInStudent.set(student);
    this.checkInAlert.set(null);
  }

  registerCheckIn(student: Student): void {
    const selected = this.selectedCheckInClass();

    if (!selected || this.checkInSaving()) {
      return;
    }

    if (!this.isCheckInWindowOpen(selected)) {
      this.checkInAlert.set({
        type: 'warning',
        message: this.getCheckInWindowMessage(selected)
      });
      return;
    }

    this.selectedCheckInStudent.set(student);
    this.checkInSaving.set(true);
    this.checkInAlert.set(null);

    this.classesService.checkIn(selected.id, student.id).subscribe({
      next: (response) => {
        this.checkInSaving.set(false);
        this.checkInAlert.set({
          type: 'success',
          message: response.message || 'Check-in registrado correctamente.'
        });

        if (response.class) {
          this.selectedCheckInClass.set(response.class);
          this.classes.update((classes) => {
            return classes.map((item) => {
              return item.id === response.class.id ? response.class : item;
            });
          });
        }

        if (response.student) {
          this.updateStudentLocally(response.student);
        }

        this.selectedCheckInStudent.set(null);

        this.loadClasses();
        this.reloadStudents();
      },
      error: (err) => {
        console.error(err);
        this.checkInSaving.set(false);
        this.checkInAlert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo registrar el check-in.')
        });
      }
    });
  }

  getCheckInReservation(student: Student): any | null {
    const selected = this.selectedCheckInClass();

    if (!selected) {
      return null;
    }

    return selected.reservations?.find((reservation: any) => {
      return reservation.studentId === student.id || reservation.student?.id === student.id;
    }) || null;
  }

  hasCheckInAttendance(student: Student): boolean {
    const selected = this.selectedCheckInClass();

    if (!selected) {
      return false;
    }

    return !!selected.attendances?.some((attendance: any) => {
      return attendance.studentId === student.id || attendance.student?.id === student.id;
    });
  }

  hasCheckInHeldReservation(student: Student): boolean {
    const reservation = this.getCheckInReservation(student);
    return ['RESERVED', 'CONFIRMED'].includes(reservation?.status);
  }

  getActiveCredits(student: Student, area = this.selectedCheckInClass()?.area): number {
    const now = Date.now();
    const targetArea = this.getOperationalArea(area);

    return student.memberships?.reduce((total, membership: any) => {
      const expiresAt = new Date(membership.expirationDate).getTime();
      const isActive =
        membership.status === 'ACTIVE' &&
        Number(membership.availableCredits || 0) > 0 &&
        expiresAt >= now &&
        membership.package?.area === targetArea;

      return isActive ? total + Number(membership.availableCredits || 0) : total;
    }, 0) || 0;
  }

  canCheckInStudent(student: Student): boolean {
    const selected = this.selectedCheckInClass();

    if (selected && !this.isCheckInWindowOpen(selected)) {
      return false;
    }

    if (student.status === 'INACTIVO' || student.status === 'BLOQUEADO') {
      return false;
    }

    if (this.hasCheckInAttendance(student)) {
      return false;
    }

    const reservation = this.getCheckInReservation(student);
    const hasConsumedCredit = !!reservation?.creditConsumed;
    const hasCredits = this.getActiveCredits(student, selected?.area) > 0;

    if (!hasConsumedCredit && !hasCredits) {
      return false;
    }

    if (!this.hasCheckInHeldReservation(student) && !this.hasCheckInAvailableSpots()) {
      return false;
    }

    return true;
  }

  getCheckInButtonText(student: Student): string {
    if (this.checkInSaving() && this.selectedCheckInStudent()?.id === student.id) {
      return 'Registrando...';
    }

    const selected = this.selectedCheckInClass();

    if (selected && !this.isCheckInWindowOpen(selected)) {
      return 'Fuera de horario';
    }

    if (student.status === 'INACTIVO' || student.status === 'BLOQUEADO') {
      return 'Estado no válido';
    }

    if (this.hasCheckInAttendance(student)) return 'Ya registrado';

    const reservation = this.getCheckInReservation(student);

    if (!reservation?.creditConsumed && this.getActiveCredits(student, selected?.area) <= 0) {
      return 'Sin créditos';
    }

    if (!this.hasCheckInHeldReservation(student) && !this.hasCheckInAvailableSpots()) {
      return 'Sin cupo';
    }

    return 'Registrar check-in';
  }

  getCheckInReservationLabel(student: Student): string {
    const reservation = this.getCheckInReservation(student);

    if (!reservation) {
      return 'Sin reservación';
    }

    if (reservation.status === 'ATTENDED') return 'Reservación atendida';
    if (reservation.status === 'RESERVED') return 'Reservado';
    if (reservation.status === 'CONFIRMED') return 'Confirmado';
    if (reservation.status === 'WAITING_LIST') return 'Lista de espera';
    if (reservation.status === 'CANCELLED') return 'Reservación cancelada';
    if (reservation.status === 'RELEASED') return 'Reservación liberada';

    return `Reservación: ${reservation.status}`;
  }

  getCheckInCreditLabel(student: Student): string {
    const selected = this.selectedCheckInClass();
    const credits = this.getActiveCredits(student, selected?.area);
    const reservation = this.getCheckInReservation(student);
    const areaLabel = this.getAreaLabel(selected?.area);

    if (reservation?.creditConsumed) {
      return 'Crédito ya consumido';
    }

    return credits > 0
      ? `Créditos ${areaLabel}: ${credits}`
      : `Sin créditos ${areaLabel}`;
  }

  getCheckInAttendanceLabel(student: Student): string {
    return this.hasCheckInAttendance(student)
      ? 'Asistencia registrada'
      : 'Sin asistencia';
  }

  getCheckInStudentStatusLabel(student: Student): string {
    if (student.status === 'BLOQUEADO') return 'Alumno bloqueado';
    if (student.status === 'INACTIVO') return 'Alumno inactivo';
    return 'Alumno activo';
  }

  hasCheckInAvailableSpots(): boolean {
    const selected = this.selectedCheckInClass();
    return selected ? this.getAvailableSpots(selected) > 0 : false;
  }

  isCheckInWindowOpen(item: AticoClass | null): boolean {
    if (!item) {
      return false;
    }

    const now = Date.now();
    const window = this.getCheckInWindow(item);

    return now >= window.start.getTime() && now <= window.end.getTime();
  }

  getCheckInWindowMessage(item: AticoClass): string {
    const window = this.getCheckInWindow(item);
    return `El check-in solo está disponible de ${this.formatTimeFromDate(window.start)} a ${this.formatTimeFromDate(window.end)}.`;
  }

  openReservationForm(): void {
    this.reservationAlert.set(null);
    this.showReservationForm.set(true);
  }

  closeReservationForm(): void {
    this.showReservationForm.set(false);
    this.reservationAlert.set(null);
    this.reservingStudentId.set(null);
  }

  getStudentCredits(student: Student, area = this.selectedClass()?.area): number {
    const targetArea = this.getOperationalArea(area);

    return student.memberships?.reduce((total, m: any) => {
      return m.package?.area === targetArea
        ? total + Number(m.availableCredits || 0)
        : total;
    }, 0) || 0;
  }

  isStudentAlreadyReserved(student: Student): boolean {
    const selected = this.selectedClass();

    return !!selected?.reservations?.some((reservation: any) => {
      return reservation.studentId === student.id && reservation.status !== 'CANCELLED';
    });
  }

  getReservationButtonText(student: Student): string {
    if (this.isStudentAlreadyReserved(student)) return 'Ya reservado';
    if (this.getStudentCredits(student) <= 0) return `Sin créditos ${this.getAreaLabel(this.selectedClass()?.area)}`;
    if (this.reservingStudentId() === student.id) return 'Reservando...';
    return 'Reservar';
  }

  reserveStudent(student: Student): void {
    const selected = this.selectedClass();
    if (!selected) return;

    this.reservingStudentId.set(student.id);

    this.reservationsService.create({
      studentId: student.id,
      classId: selected.id
    }).subscribe({
      next: (reservation: any) => {
        this.reservingStudentId.set(null);

        if (reservation?.creditConsumed) {
          this.decrementStudentCreditLocally(student.id, reservation.creditMembershipId);
        }

        this.addReservationToSelectedClass(reservation);
        this.reservationAlert.set({
          type: 'success',
          message: 'Reservación creada correctamente.'
        });

        this.loadClasses();
      },
      error: err => {
        this.reservingStudentId.set(null);
        this.reservationAlert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo crear la reservación.')
        });
      }
    });
  }

  addReservationToSelectedClass(reservation: any): void {
    const selected = this.selectedClass();
    if (!selected || !reservation) return;

    const normalizedReservation = {
      ...reservation,
      studentId: reservation.studentId || reservation.student?.id,
      classId: reservation.classId || selected.id,
      student: reservation.student,
      status: reservation.status || 'RESERVED',
    };

    const alreadyExists = selected.reservations?.some((item: any) => {
      return item.id === normalizedReservation.id || item.studentId === normalizedReservation.studentId;
    });

    if (alreadyExists) {
      return;
    }

    const updatedClass = {
      ...selected,
      reservations: [
        ...(selected.reservations || []),
        normalizedReservation,
      ],
    };

    this.selectedClass.set(updatedClass);

    this.classes.update((classes) => {
      return classes.map((item) => {
        if (item.id !== selected.id) {
          return item;
        }

        return updatedClass;
      });
    });
  }

  cancelReservation(reservation: any): void {
    if (!reservation?.id) return;

    const canRefund = this.canRefundReservation(reservation);
    const confirmationMessage = canRefund
      ? '¿Cancelar esta reservación y devolver el crédito?'
      : '¿Cancelar esta reservación? No aplica devolución de crédito.';

    if (!confirm(confirmationMessage)) {
      return;
    }

    this.reservationsService.update(reservation.id, {
      status: 'CANCELLED'
    }).subscribe({
      next: (updatedReservation: any) => {
        this.removeReservationFromSelectedClass(reservation.id);

        const creditWasRefunded =
          !!reservation.creditConsumed &&
          (updatedReservation?.creditConsumed === false || canRefund);

        if (creditWasRefunded) {
          this.incrementStudentCreditLocally(
            reservation.studentId || reservation.student?.id,
            reservation.creditMembershipId
          );
        }

        this.reservationAlert.set({
          type: creditWasRefunded ? 'success' : 'warning',
          message: creditWasRefunded
            ? 'Reservación cancelada y crédito devuelto.'
            : 'Reservación cancelada. No aplica devolución de crédito.'
        });
        this.loadClasses();
      },
      error: err => {
        this.reservationAlert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo cancelar la reservación.')
        });
      }
    });
  }

  removeReservationFromSelectedClass(reservationId: string): void {
    const selected = this.selectedClass();
    if (!selected) return;

    const updatedClass = {
      ...selected,
      reservations: (selected.reservations || []).filter((item: any) => item.id !== reservationId),
    };

    this.selectedClass.set(updatedClass);

    this.classes.update((classes) => {
      return classes.map((item) => {
        if (item.id !== selected.id) {
          return item;
        }

        return updatedClass;
      });
    });
  }

  decrementStudentCreditLocally(studentId: string, membershipId?: string | null): void {
    this.students.update((students) => {
      return students.map((student) => {
        if (student.id !== studentId) {
          return student;
        }

        let creditDiscounted = false;

        return {
          ...student,
          memberships: student.memberships?.map((membership: any) => {
            if (creditDiscounted) {
              return membership;
            }

            if (membership.status && membership.status !== 'ACTIVE') {
              return membership;
            }

            if (membershipId && membership.id !== membershipId) {
              return membership;
            }

            const availableCredits = Number(membership.availableCredits || 0);

            if (availableCredits <= 0) {
              return membership;
            }

            creditDiscounted = true;

            return {
              ...membership,
              availableCredits: availableCredits - 1,
            };
          }) || [],
        };
      });
    });
  }

  incrementStudentCreditLocally(studentId: string, membershipId?: string | null): void {
    this.students.update((students) => {
      return students.map((student) => {
        if (student.id !== studentId) {
          return student;
        }

        let creditReturned = false;

        return {
          ...student,
          memberships: student.memberships?.map((membership: any) => {
            if (creditReturned) {
              return membership;
            }

            if (membership.status && membership.status !== 'ACTIVE') {
              return membership;
            }

            if (membershipId && membership.id !== membershipId) {
              return membership;
            }

            creditReturned = true;

            return {
              ...membership,
              availableCredits: Number(membership.availableCredits || 0) + 1,
            };
          }) || [],
        };
      });
    });
  }


  getVisibleReservations(): any[] {
    const selected = this.selectedClass();

    return (selected?.reservations || []).filter((reservation: any) => {
      return reservation.status !== 'CANCELLED';
    });
  }

  canCancelReservation(reservation: any): boolean {
    if (!reservation) return false;

    return (
      ['RESERVED', 'CONFIRMED', 'WAITING_LIST'].includes(reservation.status) &&
      !this.hasAttendanceForReservation(reservation)
    );
  }

  canRefundReservation(reservation: any): boolean {
    const startDate = reservation?.class?.startDate || this.selectedClass()?.startDate;

    if (!startDate) {
      return false;
    }

    const classStart = new Date(startDate).getTime();
    const now = Date.now();
    const threeHoursInMs = 3 * 60 * 60 * 1000;

    return classStart - now >= threeHoursInMs;
  }

  getCancelReservationButtonText(reservation: any): string {
    return this.canRefundReservation(reservation)
      ? 'Cancelar y devolver crédito'
      : 'Cancelar sin devolución';
  }

  hasAttendanceForReservation(reservation: any): boolean {
    const selected = this.selectedClass();
    const studentId = reservation.studentId || reservation.student?.id;

    return !!selected?.attendances?.some((attendance: any) => {
      return attendance.studentId === studentId;
    });
  }

  getAttendanceButtonText(reservation: any): string {
    if (this.hasAttendanceForReservation(reservation)) return 'Asistencia registrada';
    if (this.registeringAttendanceId() === reservation.id) return 'Registrando...';
    return 'Registrar asistencia';
  }

  registerAttendance(reservation: any): void {
    this.registeringAttendanceId.set(reservation.id);

    this.attendancesService.create({
      reservationId: reservation.id,
      status: 'PRESENT'
    }).subscribe({
      next: (attendance: any) => {
        this.registeringAttendanceId.set(null);
        this.markReservationAttendedLocally(reservation, attendance);
        this.attendanceAlert.set({
          type: 'success',
          message: 'Asistencia registrada correctamente.'
        });
        this.loadClasses();
      },
      error: err => {
        this.registeringAttendanceId.set(null);
        this.attendanceAlert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo registrar la asistencia.')
        });
      }
    });
  }

  markReservationAttendedLocally(reservation: any, attendance: any): void {
    const selected = this.selectedClass();
    if (!selected) return;

    const studentId = reservation.studentId || reservation.student?.id;
    const normalizedAttendance = {
      ...attendance,
      studentId,
      classId: reservation.classId || selected.id,
      student: attendance?.student || reservation.student,
    };

    const updatedClass = {
      ...selected,
      reservations: (selected.reservations || []).map((item: any) => {
        if (item.id !== reservation.id) {
          return item;
        }

        return {
          ...item,
          status: 'ATTENDED',
        };
      }),
      attendances: [
        ...((selected.attendances || []).filter((item: any) => {
          return item.studentId !== studentId;
        })),
        normalizedAttendance,
      ],
    };

    this.selectedClass.set(updatedClass);

    this.classes.update((classes) => {
      return classes.map((item) => {
        if (item.id !== selected.id) {
          return item;
        }

        return updatedClass;
      });
    });
  }

  deleteClass(item: AticoClass, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.canEditClasses()) {
      return;
    }

    const confirmed = confirm(`¿Eliminar ${this.getClassTitle(item)}?`);

    if (!confirmed) return;

    this.classesService.delete(item.id).subscribe({
      next: () => {
        this.closeDetail();
        this.loadClasses();
        this.setPageAlert('success', 'Evento eliminado correctamente.');
      },
      error: err => {
        console.error(err);
        this.setPageAlert('error', this.getApiErrorMessage(err, 'No se pudo eliminar el evento.'));
      }
    });
  }

  private setPageAlert(type: AlertType, message: string): void {
    this.pageAlert.set({ type, message });
  }

  private setFormAlert(type: AlertType, message: string): void {
    this.formAlert.set({ type, message });
  }

  private clearPageAlert(): void {
    this.pageAlert.set(null);
  }

  private clearFormAlert(): void {
    this.formAlert.set(null);
  }

  private getClassListForFilters(): AticoClass[] {
    return this.classes().filter((item) => item.type !== 'RENTAL');
  }

  private formatDateTimeInput(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private getRentalItemIds(item: AticoClass): string[] {
    if (!Array.isArray(item.rentalItems)) {
      return [];
    }

    return item.rentalItems
      .map((rentalItem: any) => rentalItem?.id)
      .filter(Boolean);
  }

  private getDateTime(value: string): number {
    return new Date(value).getTime();
  }

  private getCheckInWindow(item: AticoClass): { start: Date; end: Date } {
    const start = new Date(item.startDate);
    start.setMinutes(start.getMinutes() - 30);

    const end = new Date(item.startDate);
    end.setMinutes(end.getMinutes() + 20);

    return { start, end };
  }

  private formatTimeFromDate(value: Date): string {
    const hours = value.getHours().toString().padStart(2, '0');
    const minutes = value.getMinutes().toString().padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  private getTodayBounds(): { start: number; end: number } {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
      start: start.getTime(),
      end: end.getTime()
    };
  }

  private isToday(value: string): boolean {
    const time = this.getDateTime(value);
    const { start, end } = this.getTodayBounds();

    return time >= start && time < end;
  }

  private isUpcoming(value: string): boolean {
    const time = this.getDateTime(value);
    const { end } = this.getTodayBounds();

    return time >= end;
  }

  private isPast(value: string): boolean {
    const time = this.getDateTime(value);
    const { start } = this.getTodayBounds();

    return time < start;
  }

  private reloadStudents(): void {
    this.studentsService.getAll().subscribe({
      next: students => this.students.set(students),
      error: err => {
        console.error(err);
        this.checkInAlert.set({
          type: 'warning',
          message: 'El check-in se registró, pero no se pudo refrescar la lista de alumnos.'
        });
      }
    });
  }

  private updateStudentLocally(student: Student): void {
    this.students.update((students) => {
      return students.map((item) => {
        return item.id === student.id ? student : item;
      });
    });

    if (this.selectedCheckInStudent()?.id === student.id) {
      this.selectedCheckInStudent.set(student);
    }
  }

  private refreshOpenClassReferences(classes: AticoClass[]): void {
    const checkInClass = this.selectedCheckInClass();
    const detailClass = this.selectedClass();

    if (checkInClass) {
      this.selectedCheckInClass.set(
        classes.find((item) => item.id === checkInClass.id) || checkInClass
      );
    }

    if (detailClass) {
      this.selectedClass.set(
        classes.find((item) => item.id === detailClass.id) || detailClass
      );
    }
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private getOperationalArea(area?: string | null): ClassArea {
    return area === 'MUSIC' ? 'MUSIC' : 'DANCE';
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return message || fallback;
  }
}
