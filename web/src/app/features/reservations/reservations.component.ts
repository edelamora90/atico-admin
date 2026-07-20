import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  ReservationItem,
  ReservationsService
} from '../../core/services/reservations.service';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reservations.component.html',
  styleUrl: './reservations.component.scss'
})
export class ReservationsComponent implements OnInit {

  private reservationsService = inject(ReservationsService);

  reservations = signal<ReservationItem[]>([]);
  loading = signal(true);
  actionLoadingId = signal('');
  errorMessage = signal('');
  successMessage = signal('');

  searchText = signal('');
  statusFilter = signal<string>('ALL');
  periodFilter = signal<string>('all');
  areaFilter = signal<string>('ALL');
  classFilter = signal('');
  teacherFilter = signal('');

  filteredReservations = computed(() => {
    const search = this.searchText().toLowerCase().trim();
    const classText = this.classFilter().toLowerCase().trim();
    const teacherText = this.teacherFilter().toLowerCase().trim();

    return this.reservations().filter((item) => {
      const studentName = this.getStudentName(item).toLowerCase();
      const courseName = this.getClassName(item).toLowerCase();
      const teacherName = this.getTeacherName(item).toLowerCase();

      const matchesSearch =
        !search ||
        studentName.includes(search) ||
        courseName.includes(search);

      const matchesClass =
        !classText || courseName.includes(classText);

      const matchesTeacher =
        !teacherText || teacherName.includes(teacherText);

      return matchesSearch && matchesClass && matchesTeacher;
    });
  });

  reservedCount = computed(() => this.countByStatus('RESERVED'));
  attendedCount = computed(() => this.countByStatus('ATTENDED'));
  cancelledCount = computed(() => this.countByStatus('CANCELLED'));
  noShowCount = computed(() => this.countByStatus('NO_SHOW'));
  heldCreditsCount = computed(() =>
    this.filteredReservations().filter((item) =>
      item.creditConsumed &&
      ['RESERVED', 'CONFIRMED'].includes(item.status)
    ).length
  );
  refundedCreditsCount = computed(() =>
    this.filteredReservations().filter((item) =>
      item.status === 'CANCELLED' && !item.creditConsumed && Boolean(item.creditMembershipId)
    ).length
  );

  ngOnInit(): void {
    this.loadReservations();
  }

  loadReservations(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.reservationsService
      .list({
        period: this.periodFilter(),
        status: this.statusFilter(),
        area: this.areaFilter()
      })
      .subscribe({
        next: (data) => {
          this.reservations.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          this.errorMessage.set(this.getApiErrorMessage(err));
          this.loading.set(false);
        }
      });
  }

  onServerFilterChange(): void {
    this.loadReservations();
  }

  cancelReservation(item: ReservationItem): void {
    if (!item.canCancel || item.status !== 'RESERVED') {
      return;
    }

    const confirmed = confirm(
      '¿Cancelar esta reservación? Si la clase aún no inicia, se devolverá el crédito.'
    );

    if (!confirmed) {
      return;
    }

    const reason = window.prompt('Motivo de cancelación');

    if (!reason || reason.trim().length < 3) {
      this.errorMessage.set('Captura un motivo de cancelación de al menos 3 caracteres.');
      return;
    }

    this.actionLoadingId.set(item.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.reservationsService.cancel(item.id, reason.trim()).subscribe({
      next: (response) => {
        this.successMessage.set(response.message);
        this.actionLoadingId.set('');
        this.loadReservations();
      },
      error: (err) => {
        this.errorMessage.set(this.getApiErrorMessage(err));
        this.actionLoadingId.set('');
      }
    });
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(value?: string | null): string {
    if (!value) {
      return '-';
    }

    return new Date(value).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      RESERVED: 'Reservada',
      CONFIRMED: 'Confirmada',
      ATTENDED: 'Asistió',
      NO_SHOW: 'No asistió',
      CANCELLED: 'Cancelada',
      WAITING_LIST: 'Lista de espera'
    };

    return labels[status] || status;
  }

  getAreaLabel(area?: string | null): string {
    if (area === 'MUSIC') {
      return 'Música';
    }

    if (area === 'DANCE') {
      return 'Danza';
    }

    return '-';
  }

  getStudentName(item: ReservationItem): string {
    return item.studentName || item.student?.name || 'Sin alumno';
  }

  getClassName(item: ReservationItem): string {
    return item.className || item.class?.course?.name || 'Sin clase';
  }

  getTeacherName(item: ReservationItem): string {
    return item.teacherName || item.class?.teacher?.name || 'Sin docente';
  }

  getClassDate(item: ReservationItem): string | undefined {
    return item.classDate || item.class?.startDate;
  }

  getCreditLabel(item: ReservationItem): string {
    return item.creditLabel || (item.creditConsumed ? 'Apartado' : 'Sin crédito');
  }

  countByStatus(status: string): number {
    return this.filteredReservations().filter((item) => item.status === status).length;
  }

  private getApiErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const response = error.error;

      if (Array.isArray(response?.message)) {
        return response.message.join(' ');
      }

      if (typeof response?.message === 'string') {
        return response.message;
      }

      if (typeof response?.error === 'string') {
        return response.error;
      }
    }

    return 'No se pudo completar la operación.';
  }

}
