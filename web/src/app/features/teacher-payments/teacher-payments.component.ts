import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FinancePeriodFilter } from '../../core/services/finances.service';
import {
  Teacher,
  TeachersService
} from '../../core/services/teachers.service';
import {
  TeacherPaymentItem,
  TeacherPaymentTeacher,
  TeacherPaymentsParams,
  TeacherPaymentsService,
  TeacherPaymentsSummary
} from '../../core/services/teacher-payments.service';

type AreaFilter = 'ALL' | 'DANCE' | 'MUSIC';
type TeacherPaymentTypeFilter = 'ALL' | 'CLASS_SESSION' | 'CANCELLED_WITH_PAYMENT' | 'DIRECT_ENROLLMENT';
type TeacherPaymentSortField = 'date' | 'teacher' | 'amount' | 'type' | 'attendees';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-teacher-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './teacher-payments.component.html',
  styleUrl: './teacher-payments.component.scss'
})
export class TeacherPaymentsComponent implements OnInit {
  private teacherPaymentsService = inject(TeacherPaymentsService);
  private teachersService = inject(TeachersService);

  summary = signal<TeacherPaymentsSummary | null>(null);
  teachersCatalog = signal<Teacher[]>([]);
  loading = signal(true);
  errorMessage = signal('');
  selectedTeacherId = signal<string | null>(null);

  periodFilter = signal<FinancePeriodFilter>('this-month');
  areaFilter = signal<AreaFilter>('ALL');
  teacherFilter = signal<string>('ALL');
  fromFilter = signal('');
  toFilter = signal('');
  searchTerm = signal('');
  paymentTypeFilter = signal<TeacherPaymentTypeFilter>('ALL');
  sortField = signal<TeacherPaymentSortField>('date');
  sortDirection = signal<SortDirection>('desc');
  filtersOpen = signal(false);

  selectedTeacher = computed(() => {
    const id = this.selectedTeacherId();

    if (!id) {
      return null;
    }

    return this.summary()?.teachers.find((teacher) => teacher.teacherId === id) || null;
  });

  detailItems = computed(() => {
    const id = this.selectedTeacherId();
    const items = this.filteredPaymentItems();

    if (!id) {
      return items;
    }

    return items.filter((item) => item.teacherId === id);
  });

  filteredTeacherRows = computed(() => {
    const term = this.normalizeSearch(this.searchTerm());
    const teachers = this.summary()?.teachers || [];

    return teachers
      .filter((teacher) => {
        if (!term) {
          return true;
        }

        return this.normalizeSearch([
          teacher.teacherName,
          teacher.teacherId,
        ].join(' ')).includes(term);
      })
      .sort((a, b) => this.compareTeacherRows(a, b));
  });

  filteredPaymentItems = computed(() => {
    const term = this.normalizeSearch(this.searchTerm());
    const type = this.paymentTypeFilter();
    const sortField = this.sortField();
    const direction = this.sortDirection();

    return (this.summary()?.items || [])
      .filter((item) => {
        const searchable = this.normalizeSearch([
          item.teacherName,
          item.className,
          item.area,
          item.observation,
          item.packageName,
          item.source,
          item.cancellationReason,
        ].join(' '));

        if (term && !searchable.includes(term)) {
          return false;
        }

        if (type === 'CLASS_SESSION') {
          return item.source === 'CLASS_SESSION' && !item.cancellationType;
        }

        if (type === 'CANCELLED_WITH_PAYMENT') {
          return item.cancellationType === 'WITH_TEACHER_PAYMENT';
        }

        if (type === 'DIRECT_ENROLLMENT') {
          return item.source === 'DIRECT_ENROLLMENT';
        }

        return true;
      })
      .sort((a, b) => this.comparePaymentItems(a, b, sortField, direction));
  });

  ngOnInit(): void {
    this.loadTeachers();
    this.loadSummary();
  }

  loadSummary(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.teacherPaymentsService.getSummary(this.getQueryParams()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.ensureSelectedTeacherExists(summary);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('No se pudo cargar el corte docente.');
        this.loading.set(false);
      }
    });
  }

  loadTeachers(): void {
    this.teachersService.getAll().subscribe({
      next: (teachers) => {
        this.teachersCatalog.set(
          teachers
            .filter((teacher) => teacher.active)
            .sort((a, b) => a.name.localeCompare(b.name))
        );
      },
      error: () => {
        this.teachersCatalog.set([]);
      }
    });
  }

  changePeriod(period: FinancePeriodFilter): void {
    this.periodFilter.set(period);

    if (period !== 'all') {
      this.fromFilter.set('');
      this.toFilter.set('');
    }

    this.loadSummary();
  }

  applyCustomRange(): void {
    this.loadSummary();
  }

  changeArea(value: string): void {
    this.areaFilter.set(value as AreaFilter);
    this.loadSummary();
  }

  changeTeacherFilter(value: string): void {
    this.teacherFilter.set(value);
    this.selectedTeacherId.set(value === 'ALL' ? null : value);
    this.loadSummary();
  }

  selectTeacher(teacher: TeacherPaymentTeacher): void {
    if (teacher.teacherId) {
      this.selectedTeacherId.set(teacher.teacherId);
    }
  }

  clearSelectedTeacher(): void {
    this.selectedTeacherId.set(null);

    if (this.teacherFilter() !== 'ALL') {
      this.teacherFilter.set('ALL');
      this.loadSummary();
    }
  }

  exportCsv(): void {
    const summary = this.summary();

    if (!summary?.items.length) {
      return;
    }

    const rows = [
      [
        'Periodo',
        'Docente',
        'Fecha',
        'Clase',
        'Área',
        'Asistentes',
        'Observación',
        'Pago por docencia',
        'Fuente'
      ],
      ...summary.items.map((item) => [
        this.getPeriodLabel(),
        item.teacherName,
        this.formatDate(item.date),
        item.className,
        this.getAreaLabel(item.area),
        item.attendeesCount,
        item.observation || item.packageName,
        this.formatPlainMoney(item.teacherPayment),
        this.getSourceLabel(item.source)
      ])
    ];

    const csv = rows
      .map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `corte-docente-${this.getLocalDateKey(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  printReport(): void {
    window.print();
  }

  clearListFilters(): void {
    this.searchTerm.set('');
    this.paymentTypeFilter.set('ALL');
    this.sortField.set('date');
    this.sortDirection.set('desc');
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  setSort(field: TeacherPaymentSortField): void {
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortField.set(field);
    this.sortDirection.set('asc');
  }

  getSortIcon(field: TeacherPaymentSortField): string {
    if (this.sortField() !== field) {
      return '↕';
    }

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  getActiveListFiltersCount(): number {
    return [
      this.searchTerm(),
      this.paymentTypeFilter() !== 'ALL' ? this.paymentTypeFilter() : '',
    ].filter(Boolean).length;
  }

  getFilteredPaymentTotal(): number {
    return this.filteredPaymentItems().reduce((sum, item) => {
      return sum + Number(item.teacherPayment || 0);
    }, 0);
  }

  getPeriodLabel(): string {
    const period = this.summary()?.period;

    if (!period) return 'Todo el histórico';
    if (period.key === 'today') return 'Hoy';
    if (period.key === 'this-month') return 'Este mes';
    if (period.key === 'last-30-days') return 'Últimos 30 días';
    if (period.key === 'custom') return `${this.formatDateOnly(period.from)} a ${this.formatDateOnly(period.to)}`;
    return 'Todo el histórico';
  }

  getAreaLabel(area: string | null | undefined): string {
    if (area === 'MUSIC') return 'Música';
    return 'Danza';
  }

  getSourceLabel(source: string): string {
    if (source === 'DIRECT_ENROLLMENT') return 'Inscripción directa';
    if (source === 'CLASS_SESSION') return 'Sesión de clase';
    return source === 'RESERVATION' ? 'Reservación' : 'Asistencia';
  }

  getPaymentTypeLabel(item: TeacherPaymentItem): string {
    if (item.cancellationType === 'WITH_TEACHER_PAYMENT') {
      return 'Clase cancelada con pago';
    }

    if (item.cancellationType === 'WITHOUT_TEACHER_PAYMENT') {
      return 'Clase cancelada sin pago';
    }

    if (item.source === 'DIRECT_ENROLLMENT') {
      return 'Curso/taller/evento';
    }

    return 'Clase por asistencia';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateOnly(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private getQueryParams(): TeacherPaymentsParams {
    return {
      period: this.periodFilter(),
      from: this.fromFilter(),
      to: this.toFilter(),
      teacherId: this.teacherFilter(),
      area: this.areaFilter(),
    };
  }

  private comparePaymentItems(
    a: TeacherPaymentItem,
    b: TeacherPaymentItem,
    field: TeacherPaymentSortField,
    direction: SortDirection,
  ): number {
    const multiplier = direction === 'asc' ? 1 : -1;
    let result = 0;

    if (field === 'teacher') {
      result = String(a.teacherName || '').localeCompare(String(b.teacherName || ''), 'es');
    } else if (field === 'amount') {
      result = Number(a.teacherPayment || 0) - Number(b.teacherPayment || 0);
    } else if (field === 'type') {
      result = this.getPaymentTypeLabel(a).localeCompare(this.getPaymentTypeLabel(b), 'es');
    } else if (field === 'attendees') {
      result = Number(a.attendeesCount || 0) - Number(b.attendeesCount || 0);
    } else {
      result = new Date(a.date).getTime() - new Date(b.date).getTime();
    }

    return result * multiplier;
  }

  private compareTeacherRows(
    a: TeacherPaymentTeacher,
    b: TeacherPaymentTeacher,
  ): number {
    const multiplier = this.sortDirection() === 'asc' ? 1 : -1;
    const field = this.sortField();
    let result = 0;

    if (field === 'amount') {
      result = Number(a.teacherPaymentTotal || 0) - Number(b.teacherPaymentTotal || 0);
    } else if (field === 'attendees') {
      result = Number(a.payableAttendancesCount || 0) - Number(b.payableAttendancesCount || 0);
    } else {
      result = String(a.teacherName || '').localeCompare(String(b.teacherName || ''), 'es');
    }

    return result * multiplier;
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private ensureSelectedTeacherExists(summary: TeacherPaymentsSummary): void {
    const selected = this.selectedTeacherId();

    if (
      selected &&
      !summary.teachers.some((teacher) => teacher.teacherId === selected)
    ) {
      this.selectedTeacherId.set(null);
    }
  }

  private escapeCsvCell(value: string | number): string {
    const text = String(value ?? '');

    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  private formatPlainMoney(value: number): string {
    return Number(value || 0).toFixed(2);
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
