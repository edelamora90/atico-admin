import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  AttendanceHistoryItem,
  AttendanceHistoryParams,
  AttendancesService
} from '../../core/services/attendances.service';
import { FinancePeriodFilter } from '../../core/services/finances.service';

type AreaFilter = 'ALL' | 'DANCE' | 'MUSIC';
type StatusFilter = 'ALL' | 'ATTENDED' | 'RESERVED' | 'CANCELLED' | 'NO_SHOW';

@Component({
  selector: 'app-attendances',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './attendances.component.html',
  styleUrl: './attendances.component.scss'
})
export class AttendancesComponent implements OnInit {
  private attendancesService = inject(AttendancesService);

  items = signal<AttendanceHistoryItem[]>([]);
  loading = signal(true);
  errorMessage = signal('');

  periodFilter = signal<FinancePeriodFilter>('this-month');
  areaFilter = signal<AreaFilter>('ALL');
  statusFilter = signal<StatusFilter>('ALL');
  teacherFilter = signal<string>('ALL');
  search = signal('');

  filteredItems = computed(() => {
    const term = this.normalizeText(this.search());
    const teacherId = this.teacherFilter();

    return this.items().filter((item) => {
      const matchesSearch = !term || this.normalizeText(
        `${item.studentName} ${item.studentPhone || ''}`,
      ).includes(term);
      const matchesTeacher = teacherId === 'ALL' || item.teacherId === teacherId;

      return matchesSearch && matchesTeacher;
    });
  });

  teachers = computed(() => {
    const map = new Map<string, string>();

    for (const item of this.items()) {
      if (item.teacherId) {
        map.set(item.teacherId, item.teacherName);
      }
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  totalAttendances = computed(() => this.filteredItems().length);
  creditsConsumed = computed(() => {
    return this.filteredItems().filter((item) => item.creditConsumed).length;
  });
  teacherPaymentTotal = computed(() => {
    return this.filteredItems().reduce((sum, item) => {
      return sum + Number(item.teacherPayment || 0);
    }, 0);
  });
  danceCount = computed(() => {
    return this.filteredItems().filter((item) => item.area === 'DANCE').length;
  });
  musicCount = computed(() => {
    return this.filteredItems().filter((item) => item.area === 'MUSIC').length;
  });

  ngOnInit(): void {
    this.loadAttendances();
  }

  loadAttendances(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.attendancesService.list(this.getQueryParams()).subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('No se pudo cargar el historial de asistencias.');
        this.loading.set(false);
      }
    });
  }

  changePeriod(period: FinancePeriodFilter): void {
    this.periodFilter.set(period);
    this.loadAttendances();
  }

  changeArea(value: string): void {
    this.areaFilter.set(value as AreaFilter);
    this.loadAttendances();
  }

  changeStatus(value: string): void {
    this.statusFilter.set(value as StatusFilter);
    this.loadAttendances();
  }

  changeTeacher(value: string): void {
    this.teacherFilter.set(value);
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  getAreaLabel(area: string | null | undefined): string {
    if (area === 'MUSIC') return 'Música';
    if (area === 'BOTH') return 'Danza y Música';
    return 'Danza';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PRESENT: 'Asistió',
      ATTENDED: 'Asistió',
      RESERVED: 'Reservado',
      CONFIRMED: 'Confirmado',
      CANCELLED: 'Cancelado',
      NO_SHOW: 'No show',
      ABSENT: 'Ausente',
      WAITING_LIST: 'Lista de espera',
      RELEASED: 'Liberado',
    };

    return labels[status] || status;
  }

  getSourceLabel(source: string): string {
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

  private getQueryParams(): AttendanceHistoryParams {
    return {
      period: this.periodFilter(),
      area: this.areaFilter(),
      status: this.statusFilter(),
    };
  }

  private normalizeText(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
