import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  AticoClass,
  ClassSession,
  ClassesService
} from '../../core/services/classes.service';

type CalendarItemType = 'CLASS' | 'COURSE' | 'WORKSHOP' | 'EVENT' | 'RENTAL';

interface CalendarItem {
  id: string;
  type: CalendarItemType;
  title: string;
  subtitle: string;
  roomName: string;
  startDate: string;
  endDate: string | null;
  capacity?: number;
  reserved?: number;
  amount?: number;
  rentalItems?: any;
  session?: ClassSession;
  status?: string;
  cancellationType?: string | null;
  cancellationReason?: string | null;
  source: AticoClass;
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit {

  private classesService = inject(ClassesService);

  classes = signal<AticoClass[]>([]);
  loading = signal(true);
  selectedItem = signal<CalendarItem | null>(null);

  weekDays = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado'
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.classesService.getAll().subscribe({
      next: (classes) => {
        this.classes.set(classes);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  getCalendarItems(): CalendarItem[] {
    return this.classes().flatMap((item) => {
      const sessions = item.sessions || [];

      if (sessions.length) {
        return sessions.map((session) => ({
          id: session.id,
          type: item.type,
          title: item.title || 'Sin nombre',
          subtitle: item.type === 'RENTAL'
            ? 'Renta de espacio'
            : item.teacher?.name || 'Sin docente',
          roomName: item.room?.name || 'Sin salón',
          startDate: this.getDateWithTime(session.date, session.startTime).toISOString(),
          endDate: this.getDateWithTime(session.date, session.endTime).toISOString(),
          capacity: item.capacity,
          reserved: this.getSessionReservationCount(item, session.id),
          amount: item.teacherPaymentAmount || 0,
          rentalItems: item.rentalItems || [],
          session,
          status: session.status,
          cancellationType: session.cancellationType || null,
          cancellationReason: session.cancellationReason || null,
          source: item,
        }));
      }

      return [{
        id: item.id,
        type: item.type,
        title: item.title || 'Sin nombre',
        subtitle: item.type === 'RENTAL'
          ? 'Renta de espacio'
          : item.teacher?.name || 'Sin docente',
        roomName: item.room?.name || 'Sin salón',
        startDate: item.startDate,
        endDate: item.endDate || null,
        capacity: item.capacity,
        reserved: item.reservations?.length || 0,
        amount: item.teacherPaymentAmount || 0,
        rentalItems: item.rentalItems || [],
        status: 'SCHEDULED',
        source: item,
      }];
    }).sort((a, b) => {
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }

  getItemsByDay(dayIndex: number): CalendarItem[] {
    return this.getCalendarItems().filter((item) => {
      return this.getLocalDayIndex(item.startDate) === dayIndex;
    });
  }

  getLocalDayIndex(value: string): number {
    const dayName = new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      timeZone: 'America/Mexico_City'
    }).format(new Date(value)).toLowerCase();

    return this.weekDays.indexOf(dayName);
  }

  openDetail(item: CalendarItem): void {
    this.selectedItem.set(item);
  }

  closeDetail(): void {
    this.selectedItem.set(null);
  }

  getTypeLabel(type: CalendarItemType): string {
    if (type === 'COURSE') return 'Curso';
    if (type === 'WORKSHOP') return 'Taller';
    if (type === 'EVENT') return 'Evento';
    if (type === 'RENTAL') return 'Renta de espacio';
    return 'Clase';
  }

  formatTime(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City'
    }).format(new Date(value));
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Mexico_City'
    }).format(new Date(value));
  }

  formatRange(item: CalendarItem): string {
    const start = this.formatTime(item.startDate);
    const end = item.endDate ? this.formatTime(item.endDate) : 'sin término';
    return `${start} - ${end}`;
  }

  getTotalByType(type: CalendarItemType): number {
    return this.getCalendarItems().filter((item) => item.type === type).length;
  }

  getRentalItems(item: CalendarItem): any[] {
    return Array.isArray(item.rentalItems) ? item.rentalItems : [];
  }

  getSessionStatusLabel(item: CalendarItem): string {
    if (item.status !== 'CANCELLED') {
      return 'Programada';
    }

    if (item.cancellationType === 'WITH_TEACHER_PAYMENT') {
      return 'Cancelada con pago';
    }

    if (item.cancellationType === 'WITHOUT_TEACHER_PAYMENT') {
      return 'Cancelada sin pago';
    }

    return 'Cancelada';
  }

  private getSessionReservationCount(item: AticoClass, sessionId: string): number {
    return (item.reservations || []).filter((reservation: any) => {
      return (reservation.sessionId === sessionId || reservation.session?.id === sessionId) &&
        ['RESERVED', 'CONFIRMED', 'ATTENDED'].includes(reservation.status);
    }).length;
  }

  private getDateWithTime(dateValue: string, timeValue: string): Date {
    const date = new Date(dateValue);
    const [hours, minutes] = timeValue.split(':').map((part) => Number(part));
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }
}
