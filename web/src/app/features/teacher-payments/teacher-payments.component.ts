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

  selectedTeacher = computed(() => {
    const id = this.selectedTeacherId();

    if (!id) {
      return null;
    }

    return this.summary()?.teachers.find((teacher) => teacher.teacherId === id) || null;
  });

  detailItems = computed(() => {
    const id = this.selectedTeacherId();
    const items = this.summary()?.items || [];

    if (!id) {
      return [];
    }

    return items.filter((item) => item.teacherId === id);
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
        'Alumno',
        'Paquete',
        'Pago por docencia',
        'Fuente'
      ],
      ...summary.items.map((item) => [
        this.getPeriodLabel(),
        item.teacherName,
        this.formatDate(item.date),
        item.className,
        this.getAreaLabel(item.area),
        item.studentName,
        item.packageName,
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
    return source === 'RESERVATION' ? 'Reservación' : 'Asistencia';
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
