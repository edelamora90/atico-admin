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
  ClassSession,
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
import { Router } from '@angular/router';

type AlertType = 'success' | 'error' | 'warning' | 'info';
type ClassFilter = 'TODAY' | 'UPCOMING' | 'ALL' | 'PAST';
type ClassArea = 'DANCE' | 'MUSIC';
type AcademicClassType = 'CLASS' | 'COURSE' | 'WORKSHOP' | 'EVENT' | 'RENTAL';
type ScheduleMode = 'SINGLE' | 'WEEKLY' | 'EVENT';
type SessionCalendarView = 'DAY' | 'WEEK' | 'MONTH';

interface UiAlert {
  type: AlertType;
  message: string;
}

interface WeeklyScheduleFormItem {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface EventFunctionFormItem {
  date: string;
  startTime: string;
  endTime: string;
}

interface SessionCalendarItem {
  session: ClassSession;
  activity: AticoClass;
  start: Date;
  end: Date;
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
  private router = inject(Router);
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
  selectedReservationSessionId = signal<string>('');
  pageAlert = signal<UiAlert | null>(null);
  formAlert = signal<UiAlert | null>(null);

  showReservationForm = signal(false);
  reservationAlert = signal<UiAlert | null>(null);
  reservingStudentId = signal<string | null>(null);
  sessionCalendarView = signal<SessionCalendarView>('DAY');
  sessionCursorDate = signal<Date>(new Date());

  attendanceAlert = signal<UiAlert | null>(null);
  registeringAttendanceId = signal<string | null>(null);

  showCheckInDrawer = signal(false);
  selectedCheckInClass = signal<AticoClass | null>(null);
  selectedCheckInSessionId = signal<string>('');
  checkInSearchTerm = signal('');
  checkInSaving = signal(false);
  checkInAlert = signal<UiAlert | null>(null);
  selectedCheckInStudent = signal<Student | null>(null);

  form = this.fb.group({
    type: ['CLASS', Validators.required],
    scheduleMode: ['SINGLE' as ScheduleMode],
    periodIndefinite: [true],
    area: ['DANCE', Validators.required],
    title: ['', Validators.required],
    teacherId: [''],
    roomId: ['', Validators.required],
    startDate: [''],
    endDate: [''],
    startTime: [''],
    endTime: [''],
    recurrenceStart: [''],
    recurrenceEnd: [''],
    daysOfWeek: [[] as number[]],
    weeklySchedules: [[] as WeeklyScheduleFormItem[]],
    functionCount: [1],
    eventFunctions: [[{
      date: '',
      startTime: '',
      endTime: ''
    }] as EventFunctionFormItem[]],
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

    this.form.get('startDate')?.valueChanges.subscribe(() => {
      this.updateRentalTotal();
    });

    this.form.get('endDate')?.valueChanges.subscribe(() => {
      this.updateRentalTotal();
    });

    this.form.get('type')?.valueChanges.subscribe((type) => {
      if (type === 'CLASS') {
        this.form.patchValue({
          scheduleMode: 'WEEKLY',
          periodIndefinite: true
        }, { emitEvent: false });
      } else if (type === 'COURSE' || type === 'WORKSHOP') {
        this.form.patchValue({
          scheduleMode: 'WEEKLY',
          periodIndefinite: false,
          eventFunctions: this.getDefaultEventFunctions(1),
          functionCount: 1
        }, { emitEvent: false });
      } else if (type === 'EVENT') {
        this.form.patchValue({
          scheduleMode: 'EVENT',
          periodIndefinite: false,
          daysOfWeek: [],
          weeklySchedules: [],
          functionCount: 1,
          eventFunctions: this.getDefaultEventFunctions(1)
        }, { emitEvent: false });
      } else if (type !== 'RENTAL') {
        this.form.patchValue({
          scheduleMode: 'SINGLE',
          periodIndefinite: false,
          recurrenceEnd: '',
          daysOfWeek: [],
          weeklySchedules: []
        }, { emitEvent: false });
      }

      if (type === 'RENTAL') {
        this.form.patchValue({
          teacherId: '',
          capacity: 1,
          teacherPaymentAmount: 0,
          rentalItemIds: []
        });
        this.updateRentalTotal();
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
      scheduleMode: 'WEEKLY',
      periodIndefinite: true,
      area: 'DANCE',
      title: '',
      teacherId: '',
      roomId: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      recurrenceStart: '',
      recurrenceEnd: '',
      daysOfWeek: [],
      weeklySchedules: [],
      functionCount: 1,
      eventFunctions: this.getDefaultEventFunctions(1),
      durationMinutes: 60,
      capacity: 25,
      teacherPaymentAmount: 0,
      rentalItemIds: []
    }, { emitEvent: false });

    this.showForm.set(true);
    this.updateRentalTotal();
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
      scheduleMode: this.getScheduleMode(item),
      periodIndefinite: item.type === 'CLASS' && item.recurrenceType === 'WEEKLY' && !item.recurrenceEnd,
      area: this.getOperationalArea(item.area),
      title: this.getClassTitle(item),
      teacherId: item.teacher?.id || '',
      roomId: item.room?.id || '',
      startDate: this.formatDateTimeInput(item.startDate),
      endDate: item.endDate ? this.formatDateTimeInput(item.endDate) : '',
      startTime: item.startTime || '',
      endTime: item.endTime || '',
      recurrenceStart: item.recurrenceStart ? this.formatDateInput(item.recurrenceStart) : '',
      recurrenceEnd: item.recurrenceEnd ? this.formatDateInput(item.recurrenceEnd) : '',
      daysOfWeek: item.daysOfWeek || [],
      weeklySchedules: this.getWeeklySchedulesFromClass(item),
      functionCount: Math.max(this.getEventFunctionsFromClass(item).length, 1),
      eventFunctions: this.getEventFunctionsFromClass(item).length > 0
        ? this.getEventFunctionsFromClass(item)
        : this.getDefaultEventFunctions(1),
      durationMinutes: item.durationMinutes || 60,
      capacity: item.capacity || 1,
      teacherPaymentAmount: Number(item.teacherPaymentAmount || 0),
      rentalItemIds: this.getRentalItemIds(item)
    }, { emitEvent: false });

    this.showForm.set(true);
    this.updateRentalTotal();
  }

  closeCreateForm(): void {
    this.showForm.set(false);
    this.saving.set(false);
    this.editingClassId.set(null);
    this.clearFormAlert();
    this.form.reset({
      type: 'CLASS',
      scheduleMode: 'WEEKLY',
      periodIndefinite: true,
      area: 'DANCE',
      title: '',
      teacherId: '',
      roomId: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      recurrenceStart: '',
      recurrenceEnd: '',
      daysOfWeek: [],
      weeklySchedules: [],
      functionCount: 1,
      eventFunctions: this.getDefaultEventFunctions(1),
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

  isClassForm(): boolean {
    return this.form.get('type')?.value === 'CLASS';
  }

  isEventForm(): boolean {
    return this.form.get('type')?.value === 'EVENT';
  }

  hasWeeklyScheduleForm(): boolean {
    const type = this.form.get('type')?.value;
    return type === 'CLASS' || type === 'COURSE' || type === 'WORKSHOP';
  }

  isPunctualAcademicForm(): boolean {
    const type = this.form.get('type')?.value;
    return type === 'EVENT';
  }

  isPeriodIndefinite(): boolean {
    return !!this.form.get('periodIndefinite')?.value;
  }

  getWeekDays() {
    return [
      { value: 1, label: 'Lun' },
      { value: 2, label: 'Mar' },
      { value: 3, label: 'Mié' },
      { value: 4, label: 'Jue' },
      { value: 5, label: 'Vie' },
      { value: 6, label: 'Sáb' },
      { value: 0, label: 'Dom' },
    ];
  }

  isRecurringForm(): boolean {
    return this.form.get('scheduleMode')?.value !== 'SINGLE';
  }

  isDaySelected(day: number): boolean {
    return (this.form.get('daysOfWeek')?.value || []).includes(day);
  }

  toggleWeekDay(day: number, checked: boolean): void {
    const current = this.form.get('daysOfWeek')?.value || [];
    const next = checked
      ? Array.from(new Set([...current, day])).sort((a, b) => a - b)
      : current.filter((item) => item !== day);
    const currentSchedules = this.getWeeklySchedules();
    const nextSchedules = checked
      ? this.normalizeWeeklySchedules([
          ...currentSchedules,
          {
            dayOfWeek: day,
            startTime: currentSchedules[0]?.startTime || '17:00',
            endTime: currentSchedules[0]?.endTime || '18:00'
          }
        ])
      : currentSchedules.filter((item) => item.dayOfWeek !== day);

    this.form.patchValue({
      daysOfWeek: next,
      weeklySchedules: nextSchedules
    });
  }

  getWeeklyScheduleTime(day: number, field: 'startTime' | 'endTime'): string {
    return this.getWeeklySchedules().find((item) => item.dayOfWeek === day)?.[field] || '';
  }

  setWeeklyScheduleTime(day: number, field: 'startTime' | 'endTime', value: string): void {
    const schedules = this.getWeeklySchedules();
    const existing = schedules.find((item) => item.dayOfWeek === day) || {
      dayOfWeek: day,
      startTime: '',
      endTime: ''
    };
    const next = this.normalizeWeeklySchedules([
      ...schedules.filter((item) => item.dayOfWeek !== day),
      {
        ...existing,
        [field]: value
      }
    ]);

    this.form.patchValue({
      weeklySchedules: next,
      daysOfWeek: next.map((item) => item.dayOfWeek)
    });
  }

  getFormTitle(): string {
    const prefix = this.isEditingClass() ? 'Editar' : 'Programar';
    const type = this.form.get('type')?.value;

    if (type === 'COURSE') return `${prefix} curso`;
    if (type === 'WORKSHOP') return `${prefix} taller`;
    if (type === 'EVENT') return `${prefix} evento`;
    return `${prefix} clase`;
  }

  getFormSubtitle(): string {
    const type = this.form.get('type')?.value;

    if (type === 'CLASS') {
      return 'Configura los días y horarios semanales de la clase.';
    }

    if (type === 'COURSE') return 'Configura los días, horarios y periodo del curso.';
    if (type === 'WORKSHOP') return 'Configura los días, horarios y periodo del taller.';
    if (type === 'EVENT') return 'Configura cada función del evento con fecha y horario.';
    return 'Actualiza la información del registro.';
  }

  getWeeklyScheduleTitle(): string {
    const type = this.form.get('type')?.value;
    if (type === 'COURSE') return 'Días y horarios del curso';
    if (type === 'WORKSHOP') return 'Días y horarios del taller';
    return 'Días y horarios semanales';
  }

  getWeeklyScheduleDescription(): string {
    const type = this.form.get('type')?.value;
    if (type === 'COURSE') return 'Selecciona los días y horarios dentro del periodo del curso.';
    if (type === 'WORKSHOP') return 'Selecciona los días y horarios dentro del periodo del taller.';
    return 'Configura los días y horarios semanales de la clase.';
  }

  getEventFunctions(): EventFunctionFormItem[] {
    return this.normalizeEventFunctions(this.form.get('eventFunctions')?.value || []);
  }

  setFunctionCount(value: string | number): void {
    const count = Math.max(1, Math.min(20, Number(value) || 1));
    const current = this.getEventFunctions();
    const next = Array.from({ length: count }, (_, index) => {
      return current[index] || {
        date: '',
        startTime: '',
        endTime: ''
      };
    });

    this.form.patchValue({
      functionCount: count,
      eventFunctions: next
    });
  }

  setEventFunctionValue(index: number, field: 'date' | 'startTime' | 'endTime', value: string): void {
    const functions = this.getEventFunctions();
    const current = functions[index] || {
      date: '',
      startTime: '',
      endTime: ''
    };

    functions[index] = {
      ...current,
      [field]: value
    };

    this.form.patchValue({
      eventFunctions: functions
    });
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

    const total = Number(room.basePrice || 0) * this.getRentalDurationHours() + extrasTotal;

    this.form.patchValue({
      teacherPaymentAmount: total
    });
  }

  getRentalDurationHours(): number {
    const start = new Date(this.form.get('startDate')?.value || '');
    const end = new Date(this.form.get('endDate')?.value || '');
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return 0;
    }

    return durationHours;
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
    const type = (raw.type || 'CLASS') as AcademicClassType;
    const area = this.getOperationalArea(raw.area);

    if (type !== 'RENTAL' && !raw.teacherId) {
      this.setFormAlert('warning', 'Selecciona docente.');
      return;
    }

    const dateRange = this.hasWeeklyType(type)
      ? this.getWeeklyClassDateRange(raw, type)
      : type === 'EVENT'
      ? this.getEventDateRange(raw)
      : this.getPunctualDateRange(raw);

    if (!dateRange) {
      return;
    }

    const { start, end } = dateRange;

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
      rentalItemIds: raw.rentalItemIds || [],
      ...this.getRecurrencePayload(raw, start, end, type),
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
    this.sessionCalendarView.set('DAY');
    this.sessionCursorDate.set(this.getInitialSessionDate(item));
    this.selectedReservationSessionId.set(this.getDefaultSessionId(item));
  }

  closeDetail(): void {
    this.selectedClass.set(null);
    this.showReservationForm.set(false);
    this.reservationAlert.set(null);
  }

  getClassTitle(item: AticoClass): string {
    return item.title || item.course?.name || 'Sin nombre';
  }

  getTypeLabel(item: AticoClass): string {
    if (item.type === 'COURSE') return 'Curso';
    if (item.type === 'WORKSHOP') return 'Taller';
    if (item.type === 'EVENT') return 'Evento';
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

  getActivityScheduleTitle(item: AticoClass): string {
    return item.type === 'EVENT' ? 'Funciones' : 'Días y horarios';
  }

  getActivityScheduleLines(item: AticoClass, limit = 3): string[] {
    if (item.type === 'EVENT') {
      return this.getEventScheduleItems(item)
        .slice(0, limit)
        .map((eventItem, index) => {
          return `Función ${index + 1} · ${this.formatShortDate(eventItem.date)} · ${eventItem.startTime} - ${eventItem.endTime}`;
        });
    }

    const schedules = this.getWeeklyScheduleItems(item);

    if (schedules.length > 0) {
      return schedules.slice(0, limit).map((schedule) => {
        return `${this.getWeekDayName(schedule.dayOfWeek)} · ${schedule.startTime} - ${schedule.endTime}`;
      });
    }

    if (item.startTime && item.endTime) {
      return [`${item.startTime} - ${item.endTime}`];
    }

    return [this.formatDateTimeRange(item)];
  }

  getHiddenEventFunctionCount(item: AticoClass, visible = 3): number {
    if (item.type !== 'EVENT') {
      return 0;
    }

    return Math.max(this.getEventScheduleItems(item).length - visible, 0);
  }

  getActivityDetailScheduleLines(item: AticoClass): string[] {
    const count = item.type === 'EVENT'
      ? this.getEventScheduleItems(item).length
      : this.getWeeklyScheduleItems(item).length;

    return this.getActivityScheduleLines(item, Math.max(count, 1));
  }

  getActivitySummaryLabel(item: AticoClass): string {
    return item.type === 'EVENT' ? 'Funciones' : 'Periodo';
  }

  getActivitySummaryValue(item: AticoClass): string {
    if (item.type === 'EVENT') {
      const count = this.getEventScheduleItems(item).length;
      return `Funciones: ${count}`;
    }

    return this.getActivityPeriodLabel(item);
  }

  getActivityPeriodLabel(item: AticoClass): string {
    if (item.type === 'EVENT') {
      const count = this.getEventScheduleItems(item).length;
      return count === 1 ? '1 función programada' : `${count} funciones programadas`;
    }

    const start = item.recurrenceStart || item.startDate || '';
    const end = item.recurrenceEnd || item.endDate || '';

    if (!start && !end) {
      return 'Periodo: Indefinido';
    }

    if (start && !end) {
      return `Periodo: ${this.formatShortDate(start)} - Indefinido`;
    }

    if (!start && end) {
      return `Periodo: hasta ${this.formatShortDate(end)}`;
    }

    return `Periodo: ${this.formatShortDate(start)} - ${this.formatShortDate(end)}`;
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
    this.selectedCheckInSessionId.set(this.getDefaultSessionId(item));
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
    this.selectedCheckInSessionId.set('');
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
    const sessionId = this.selectedCheckInSessionId();

    if (!sessionId) {
      this.checkInAlert.set({
        type: 'error',
        message: 'Selecciona una sesión para registrar check-in.'
      });
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

    this.classesService.checkIn(sessionId, student.id).subscribe({
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
      return this.matchesSelectedCheckInSession(reservation) &&
        (reservation.studentId === student.id || reservation.student?.id === student.id);
    }) || null;
  }

  hasCheckInAttendance(student: Student): boolean {
    const selected = this.selectedCheckInClass();

    if (!selected) {
      return false;
    }

    return !!selected.attendances?.some((attendance: any) => {
      return this.matchesSelectedCheckInSession(attendance) &&
        (attendance.studentId === student.id || attendance.student?.id === student.id);
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
    return selected ? this.getAvailableSpotsForSession(selected, this.selectedCheckInSessionId()) > 0 : false;
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

  setSelectedCheckInSession(sessionId: string): void {
    this.selectedCheckInSessionId.set(sessionId);
  }

  openReservationForm(sessionId?: string): void {
    this.reservationAlert.set(null);
    this.selectedReservationSessionId.set(sessionId || this.getDefaultSessionId(this.selectedClass()));
    this.showReservationForm.set(true);
  }

  openReservationForSession(sessionId: string): void {
    this.openReservationForm(sessionId);
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
    const sessionId = this.selectedReservationSessionId();

    return !!selected?.reservations?.some((reservation: any) => {
      return this.matchesSession(reservation, sessionId) &&
        reservation.studentId === student.id &&
        reservation.status !== 'CANCELLED';
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
    const sessionId = this.selectedReservationSessionId();

    if (!sessionId) {
      this.reservationAlert.set({
        type: 'error',
        message: 'Selecciona una sesión para crear la reservación.'
      });
      return;
    }

    this.reservingStudentId.set(student.id);

    this.reservationsService.create({
      studentId: student.id,
      sessionId,
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
      student: reservation.student,
      sessionId: reservation.sessionId,
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
    const startDate = reservation?.session?.date || reservation?.classDate;

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
      return attendance.studentId === studentId &&
        attendance.sessionId === reservation.sessionId;
    });
  }

  getAttendanceButtonText(reservation: any): string {
    if (this.hasAttendanceForReservation(reservation)) return 'Asistencia registrada';
    if (this.registeringAttendanceId() === reservation.id) return 'Registrando...';
    return 'Registrar asistencia';
  }

  registerAttendance(reservation: any): void {
    if (!reservation.sessionId) {
      this.attendanceAlert.set({
        type: 'error',
        message: 'La reservación no tiene sesión asignada.'
      });
      return;
    }

    this.registeringAttendanceId.set(reservation.id);

    this.attendancesService.create({
      reservationId: reservation.id,
      status: 'PRESENT',
      sessionId: reservation.sessionId,
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
      sessionId: attendance?.sessionId || reservation.sessionId,
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
          return item.studentId !== studentId ||
            item.sessionId !== normalizedAttendance.sessionId;
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

  canSendClassToPos(item: AticoClass | null): boolean {
    return item?.type === 'COURSE' || item?.type === 'WORKSHOP' || item?.type === 'EVENT';
  }

  sendClassToPos(item: AticoClass): void {
    this.router.navigate(['/pos'], {
      queryParams: {
        type: 'COURSE_EVENT',
        id: item.id,
      },
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

  private formatDateInput(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getScheduleMode(item: AticoClass): ScheduleMode {
    if (item.recurrenceType === 'WEEKLY') {
      return 'WEEKLY';
    }

    if (item.recurrenceType === 'CUSTOM') {
      return 'EVENT';
    }

    return 'SINGLE';
  }

  getClassSessions(item: AticoClass | null): ClassSession[] {
    return [...(item?.sessions || [])].sort((a, b) => {
      const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dateDiff || a.startTime.localeCompare(b.startTime);
    });
  }

  setSessionCalendarView(view: SessionCalendarView): void {
    this.sessionCalendarView.set(view);
  }

  moveSessionCalendar(direction: -1 | 1): void {
    const current = new Date(this.sessionCursorDate());
    const view = this.sessionCalendarView();

    if (view === 'MONTH') {
      current.setMonth(current.getMonth() + direction);
    } else {
      current.setDate(current.getDate() + (view === 'WEEK' ? direction * 7 : direction));
    }

    this.sessionCursorDate.set(current);
  }

  goToTodaySessionCalendar(): void {
    this.sessionCursorDate.set(new Date());
  }

  goToSessionDay(date: Date): void {
    this.sessionCursorDate.set(new Date(date));
    this.sessionCalendarView.set('DAY');
  }

  getSessionCalendarRangeLabel(): string {
    const cursor = this.sessionCursorDate();
    const view = this.sessionCalendarView();

    if (view === 'DAY') {
      return this.formatShortDate(cursor.toISOString());
    }

    if (view === 'WEEK') {
      const start = this.getWeekStart(cursor);
      const end = this.addDays(start, 6);
      return `${this.formatShortDate(start.toISOString())} - ${this.formatShortDate(end.toISOString())}`;
    }

    return cursor.toLocaleDateString('es-MX', {
      month: 'long',
      year: 'numeric'
    });
  }

  getDaySessionItems(): SessionCalendarItem[] {
    return this.getSessionItemsForDate(this.sessionCursorDate());
  }

  getWeekSessionColumns(): { date: Date; label: string; items: SessionCalendarItem[] }[] {
    const start = this.getWeekStart(this.sessionCursorDate());

    return Array.from({ length: 7 }, (_, index) => {
      const date = this.addDays(start, index);

      return {
        date,
        label: this.getWeekDayName(date.getDay()),
        items: this.getSessionItemsForDate(date)
      };
    });
  }

  getMonthCalendarWeeks(): { date: Date; inMonth: boolean; items: SessionCalendarItem[] }[][] {
    const cursor = this.sessionCursorDate();
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = this.getWeekStart(firstDay);

    return Array.from({ length: 6 }, (_, weekIndex) => {
      return Array.from({ length: 7 }, (_, dayIndex) => {
        const date = this.addDays(start, (weekIndex * 7) + dayIndex);

        return {
          date,
          inMonth: date.getMonth() === cursor.getMonth(),
          items: this.getSessionItemsForDate(date)
        };
      });
    });
  }

  getSessionTimeLabel(item: SessionCalendarItem): string {
    return `${item.session.startTime} - ${item.session.endTime}`;
  }

  getSessionAvailabilityLabel(item: AticoClass, session: ClassSession): string {
    const available = this.getAvailableSpotsForSession(item, session.id);
    return available > 0 ? `${available} libres` : 'Sin cupo';
  }

  canReserveSession(item: AticoClass, session: ClassSession): boolean {
    return session.status !== 'CANCELLED' && this.getAvailableSpotsForSession(item, session.id) > 0;
  }

  getMonthSessionSummaries(day: { items: SessionCalendarItem[] }): SessionCalendarItem[] {
    return day.items.slice(0, 3);
  }

  getMonthHiddenSessionCount(day: { items: SessionCalendarItem[] }): number {
    return Math.max(day.items.length - 3, 0);
  }

  getDefaultSessionId(item: AticoClass | null): string {
    return this.getClassSessions(item)
      .find((session) => session.status !== 'CANCELLED')?.id || '';
  }

  setSelectedReservationSession(sessionId: string): void {
    this.selectedReservationSessionId.set(sessionId);
  }

  getSessionLabel(session: ClassSession): string {
    return `${this.formatDate(session.date)} · ${session.startTime} - ${session.endTime}`;
  }

  getAvailableSpotsForSession(item: AticoClass, sessionId: string): number {
    if (!sessionId) {
      return 0;
    }

    const used = (item.reservations || []).filter((reservation: any) => {
      return this.matchesSession(reservation, sessionId) &&
        ['RESERVED', 'CONFIRMED', 'ATTENDED'].includes(reservation.status);
    }).length;

    return Math.max(item.capacity - used, 0);
  }

  private matchesSelectedCheckInSession(item: any): boolean {
    return this.matchesSession(item, this.selectedCheckInSessionId());
  }

  private matchesSession(item: any, sessionId: string): boolean {
    return !!sessionId && (item.sessionId === sessionId || item.session?.id === sessionId);
  }

  private getRecurrencePayload(raw: any, start: Date, end: Date, type: AcademicClassType) {
    if (this.hasWeeklyType(type)) {
      const weeklySchedules = this.normalizeWeeklySchedules(raw.weeklySchedules || []);
      const firstSchedule = weeklySchedules[0];

      return {
        recurrenceType: 'WEEKLY' as const,
        daysOfWeek: weeklySchedules.map((item) => item.dayOfWeek),
        weeklySchedules,
        startTime: firstSchedule?.startTime || this.formatTimeFromDate(start),
        endTime: firstSchedule?.endTime || this.formatTimeFromDate(end),
        recurrenceStart: raw.recurrenceStart
          ? new Date(`${raw.recurrenceStart}T00:00:00`).toISOString()
          : start.toISOString(),
        recurrenceEnd: type === 'CLASS' && (raw.periodIndefinite || !raw.recurrenceEnd)
          ? null
          : new Date(`${raw.recurrenceEnd}T23:59:59.999`).toISOString(),
        eventFunctions: [],
      };
    }

    if (type === 'EVENT') {
      return {
        recurrenceType: 'CUSTOM' as const,
        daysOfWeek: [],
        weeklySchedules: [],
        eventFunctions: this.normalizeEventFunctions(raw.eventFunctions || []),
        startTime: this.formatTimeFromDate(start),
        endTime: this.formatTimeFromDate(end),
        recurrenceStart: start.toISOString(),
        recurrenceEnd: end.toISOString(),
      };
    }

    const scheduleMode = raw.scheduleMode || 'SINGLE';

    if (scheduleMode === 'SINGLE') {
      return {
        recurrenceType: 'NONE' as const,
        weeklySchedules: [],
        eventFunctions: [],
      };
    }

    return {
      recurrenceType: scheduleMode === 'WEEKLY' ? 'WEEKLY' as const : 'CUSTOM' as const,
      daysOfWeek: raw.daysOfWeek || [],
      startTime: raw.startTime || this.formatTimeFromDate(start),
      endTime: raw.endTime || this.formatTimeFromDate(end),
      recurrenceStart: raw.recurrenceStart
        ? new Date(`${raw.recurrenceStart}T00:00:00`).toISOString()
        : start.toISOString(),
      recurrenceEnd: raw.recurrenceEnd
        ? new Date(`${raw.recurrenceEnd}T23:59:59.999`).toISOString()
        : end.toISOString(),
      weeklySchedules: [],
      eventFunctions: [],
    };
  }

  private getWeeklyClassDateRange(raw: any, type: AcademicClassType): { start: Date; end: Date } | null {
    const recurrenceStart = raw.recurrenceStart;
    const weeklySchedules = this.normalizeWeeklySchedules(raw.weeklySchedules || []);

    if (!recurrenceStart) {
      this.setFormAlert('warning', 'Selecciona fecha inicio de recurrencia.');
      return null;
    }

    if (weeklySchedules.length === 0) {
      this.setFormAlert('warning', 'Selecciona al menos un día de la semana.');
      return null;
    }

    for (const schedule of weeklySchedules) {
      if (!schedule.startTime || !schedule.endTime) {
        this.setFormAlert('warning', 'Captura hora inicio y término para cada día seleccionado.');
        return null;
      }

      if (this.getTimeMinutes(schedule.endTime) <= this.getTimeMinutes(schedule.startTime)) {
        this.setFormAlert('warning', 'La hora de término debe ser mayor a la hora de inicio.');
        return null;
      }
    }

    const requiresEnd = type === 'COURSE' || type === 'WORKSHOP' || !raw.periodIndefinite;

    if (requiresEnd && !raw.recurrenceEnd) {
      this.setFormAlert('warning', 'Selecciona fecha fin de recurrencia o activa periodo indefinido.');
      return null;
    }

    if (requiresEnd) {
      const recurrenceEnd = new Date(`${raw.recurrenceEnd}T00:00:00`);
      const recurrenceStartDate = new Date(`${recurrenceStart}T00:00:00`);

      if (recurrenceEnd < recurrenceStartDate) {
        this.setFormAlert('warning', 'La fecha fin de recurrencia debe ser mayor o igual a la fecha inicio.');
        return null;
      }
    }

    const firstSchedule = weeklySchedules[0];
    const firstDate = this.getFirstOccurrenceDate(recurrenceStart, firstSchedule.dayOfWeek);
    const start = new Date(`${firstDate}T${firstSchedule.startTime}:00`);
    const end = new Date(`${firstDate}T${firstSchedule.endTime}:00`);

    return { start, end };
  }

  private getEventDateRange(raw: any): { start: Date; end: Date } | null {
    const eventFunctions = this.normalizeEventFunctions(raw.eventFunctions || []);

    if (eventFunctions.length === 0) {
      this.setFormAlert('warning', 'Agrega al menos una función del evento.');
      return null;
    }

    for (const eventFunction of eventFunctions) {
      if (!eventFunction.date || !eventFunction.startTime || !eventFunction.endTime) {
        this.setFormAlert('warning', 'Captura fecha, hora inicio y hora término de cada función.');
        return null;
      }

      if (this.getTimeMinutes(eventFunction.endTime) <= this.getTimeMinutes(eventFunction.startTime)) {
        this.setFormAlert('warning', 'La hora de término debe ser mayor a la hora de inicio.');
        return null;
      }
    }

    const sorted = [...eventFunctions].sort((a, b) => {
      return `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`);
    });
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
      start: new Date(`${first.date}T${first.startTime}:00`),
      end: new Date(`${last.date}T${last.endTime}:00`),
    };
  }

  private getPunctualDateRange(raw: any): { start: Date; end: Date } | null {
    const start = new Date(raw.startDate || '');
    const end = new Date(raw.endDate || '');

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      this.setFormAlert('warning', 'Captura fecha y hora de inicio y término.');
      return null;
    }

    if (end <= start) {
      this.setFormAlert('warning', 'La fecha de término debe ser mayor a la fecha de inicio.');
      return null;
    }

    return { start, end };
  }

  private getWeeklySchedules(): WeeklyScheduleFormItem[] {
    return this.normalizeWeeklySchedules(this.form.get('weeklySchedules')?.value || []);
  }

  private getWeeklySchedulesFromClass(item: AticoClass): WeeklyScheduleFormItem[] {
    const storedSchedules = this.normalizeWeeklySchedules(item.weeklySchedules || []);

    if (storedSchedules.length > 0) {
      return storedSchedules;
    }

    return this.normalizeWeeklySchedules((item.daysOfWeek || []).map((dayOfWeek) => ({
      dayOfWeek,
      startTime: item.startTime || '',
      endTime: item.endTime || '',
    })));
  }

  private getEventFunctionsFromClass(item: AticoClass): EventFunctionFormItem[] {
    return this.normalizeEventFunctions(item.eventFunctions || []);
  }

  private normalizeWeeklySchedules(value: unknown): WeeklyScheduleFormItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const byDay = new Map<number, WeeklyScheduleFormItem>();

    for (const item of value) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      const schedule = item as Record<string, unknown>;
      const dayOfWeek = Number(schedule['dayOfWeek']);
      const startTime = String(schedule['startTime'] || '');
      const endTime = String(schedule['endTime'] || '');

      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        continue;
      }

      byDay.set(dayOfWeek, {
        dayOfWeek,
        startTime,
        endTime,
      });
    }

    return Array.from(byDay.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  private getTimeMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map((part) => Number(part));
    return (hours * 60) + minutes;
  }

  private normalizeEventFunctions(value: unknown): EventFunctionFormItem[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }

        const eventFunction = item as Record<string, unknown>;

        return {
          date: String(eventFunction['date'] || ''),
          startTime: String(eventFunction['startTime'] || ''),
          endTime: String(eventFunction['endTime'] || ''),
        };
      })
      .filter((item): item is EventFunctionFormItem => !!item);
  }

  private getDefaultEventFunctions(count: number): EventFunctionFormItem[] {
    return Array.from({ length: count }, () => ({
      date: '',
      startTime: '',
      endTime: '',
    }));
  }

  private hasWeeklyType(type: AcademicClassType): boolean {
    return type === 'CLASS' || type === 'COURSE' || type === 'WORKSHOP';
  }

  private getFirstOccurrenceDate(startDate: string, dayOfWeek: number): string {
    const date = new Date(`${startDate}T00:00:00`);

    while (date.getDay() !== dayOfWeek) {
      date.setDate(date.getDate() + 1);
    }

    return this.formatDateInput(date.toISOString());
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
    const selectedSession = this.getClassSessions(item).find((session) => {
      return session.id === this.selectedCheckInSessionId();
    });

    if (selectedSession) {
      const start = this.getDateWithTime(selectedSession.date, selectedSession.startTime);
      start.setMinutes(start.getMinutes() - 30);
      const end = this.getDateWithTime(selectedSession.date, selectedSession.startTime);
      end.setMinutes(end.getMinutes() + 20);
      return { start, end };
    }

    const start = item.recurrenceType && item.recurrenceType !== 'NONE' && item.startTime
      ? this.getTodayWithTime(item.startTime)
      : new Date(item.startDate);
    start.setMinutes(start.getMinutes() - 30);

    const end = item.recurrenceType && item.recurrenceType !== 'NONE' && item.startTime
      ? this.getTodayWithTime(item.startTime)
      : new Date(item.startDate);
    end.setMinutes(end.getMinutes() + 20);

    return { start, end };
  }

  private getTodayWithTime(time: string): Date {
    const [hours, minutes] = time.split(':').map((part) => Number(part));
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }

  private getDateWithTime(dateValue: string, time: string): Date {
    const [hours, minutes] = time.split(':').map((part) => Number(part));
    const date = new Date(dateValue);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }

  private getInitialSessionDate(item: AticoClass): Date {
    const sessions = this.getClassSessions(item).filter((session) => session.status !== 'CANCELLED');
    const now = new Date();
    const upcoming = sessions.find((session) => this.startOfLocalDay(new Date(session.date)).getTime() >= this.startOfLocalDay(now).getTime());
    const first = upcoming || sessions[0];

    return first ? new Date(first.date) : now;
  }

  private getSessionItemsForDate(date: Date): SessionCalendarItem[] {
    const activity = this.selectedClass();

    if (!activity) {
      return [];
    }

    return this.getClassSessions(activity)
      .filter((session) => this.isSameLocalDate(new Date(session.date), date))
      .map((session) => {
        const start = this.getDateWithTime(session.date, session.startTime);
        const end = this.getDateWithTime(session.date, session.endTime);

        return {
          session,
          activity,
          start,
          end
        };
      })
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private getWeeklyScheduleItems(item: AticoClass): WeeklyScheduleFormItem[] {
    const schedules = this.normalizeWeeklySchedules(item.weeklySchedules || []);

    if (schedules.length > 0) {
      return schedules.sort((a, b) => {
        const dayDiff = this.getWeekSortValue(a.dayOfWeek) - this.getWeekSortValue(b.dayOfWeek);
        return dayDiff || a.startTime.localeCompare(b.startTime);
      });
    }

    return (item.daysOfWeek || []).map((dayOfWeek) => ({
      dayOfWeek,
      startTime: item.startTime || this.formatTime(item.startDate),
      endTime: item.endTime || (item.endDate ? this.formatTime(item.endDate) : '')
    })).filter((schedule) => schedule.startTime && schedule.endTime);
  }

  private getEventScheduleItems(item: AticoClass): EventFunctionFormItem[] {
    const functions = this.normalizeEventFunctions(item.eventFunctions || []);

    if (functions.length > 0) {
      return functions.sort((a, b) => {
        const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
        return dateDiff || a.startTime.localeCompare(b.startTime);
      });
    }

    return this.getClassSessions(item).map((session) => ({
      date: this.formatDateInput(session.date),
      startTime: session.startTime,
      endTime: session.endTime
    }));
  }

  private getWeekDayName(dayOfWeek: number): string {
    const labels: Record<number, string> = {
      0: 'Domingo',
      1: 'Lunes',
      2: 'Martes',
      3: 'Miércoles',
      4: 'Jueves',
      5: 'Viernes',
      6: 'Sábado'
    };

    return labels[dayOfWeek] || 'Día';
  }

  private getWeekSortValue(dayOfWeek: number): number {
    return dayOfWeek === 0 ? 7 : dayOfWeek;
  }

  private startOfLocalDay(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private isSameLocalDate(first: Date, second: Date): boolean {
    return this.startOfLocalDay(first).getTime() === this.startOfLocalDay(second).getTime();
  }

  private getWeekStart(value: Date): Date {
    const date = this.startOfLocalDay(value);
    const day = date.getDay();
    const offset = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + offset);
    return date;
  }

  private addDays(value: Date, days: number): Date {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
  }

  formatShortDate(value: string): string {
    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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
