import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AticoClass, ClassSession, ClassesService } from '../../core/services/classes.service';
import { FinanceSummary, FinancesService } from '../../core/services/finances.service';
import { MembershipsService } from '../../core/services/memberships.service';
import { RentalsService, Rental } from '../../core/services/rentals.service';
import { ReservationItem, ReservationsService } from '../../core/services/reservations.service';
import { StoreProduct, StoreService } from '../../core/services/store.service';
import { Student, StudentsService } from '../../core/services/students.service';
import {
  TeacherPaymentsService,
  TeacherPaymentsSummary,
} from '../../core/services/teacher-payments.service';

type GadgetSize = 'small' | 'medium' | 'large';
type DashboardGadgetId =
  | 'salesToday'
  | 'monthRevenue'
  | 'todayClasses'
  | 'upcomingClasses'
  | 'recentCancellations'
  | 'pendingTeacherPayments'
  | 'activeStudents'
  | 'expiringPackages'
  | 'lowStockProducts'
  | 'upcomingRentals'
  | 'latestFinancialMovements'
  | 'cancelledClassesWithReason';

interface DashboardGadgetConfig {
  id: DashboardGadgetId;
  title: string;
  description: string;
  enabled: boolean;
  order: number;
  size: GadgetSize;
}

interface SessionSummary {
  id: string;
  classTitle: string;
  type: string;
  teacherName: string;
  roomName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  cancellationReason?: string | null;
}

interface CancellationSummary {
  id: string;
  date: string;
  type: string;
  title: string;
  reason: string;
  severity: 'normal' | 'warning';
}

interface FinancialMovement {
  id: string;
  date: string;
  title: string;
  description: string;
  amount: number;
  status?: string | null;
  kind: 'income' | 'expense' | 'info' | 'cancelled';
}

const STORAGE_KEY = 'atico-dashboard-gadgets';

const DEFAULT_DASHBOARD_GADGETS: DashboardGadgetConfig[] = [
  {
    id: 'salesToday',
    title: 'Ventas de hoy',
    description: 'Total vendido en el día.',
    enabled: true,
    order: 1,
    size: 'small',
  },
  {
    id: 'monthRevenue',
    title: 'Ingresos del mes',
    description: 'Total de ingresos del mes actual.',
    enabled: true,
    order: 2,
    size: 'small',
  },
  {
    id: 'todayClasses',
    title: 'Clases de hoy',
    description: 'Sesiones programadas para hoy.',
    enabled: true,
    order: 3,
    size: 'medium',
  },
  {
    id: 'pendingTeacherPayments',
    title: 'Pagos pendientes a maestros',
    description: 'Total estimado y maestros con saldo.',
    enabled: true,
    order: 4,
    size: 'medium',
  },
  {
    id: 'recentCancellations',
    title: 'Cancelaciones recientes',
    description: 'Clases, ventas y reservaciones canceladas.',
    enabled: true,
    order: 5,
    size: 'large',
  },
  {
    id: 'lowStockProducts',
    title: 'Productos con bajo stock',
    description: 'Productos de tienda que requieren atención.',
    enabled: true,
    order: 6,
    size: 'medium',
  },
  {
    id: 'upcomingClasses',
    title: 'Próximas clases',
    description: 'Siguientes sesiones programadas.',
    enabled: false,
    order: 7,
    size: 'medium',
  },
  {
    id: 'activeStudents',
    title: 'Alumnos activos',
    description: 'Total de alumnos activos.',
    enabled: false,
    order: 8,
    size: 'small',
  },
  {
    id: 'expiringPackages',
    title: 'Paquetes por vencer',
    description: 'Membresías próximas a vencer.',
    enabled: false,
    order: 9,
    size: 'medium',
  },
  {
    id: 'upcomingRentals',
    title: 'Próximas rentas',
    description: 'Reservas de espacio próximas.',
    enabled: false,
    order: 10,
    size: 'medium',
  },
  {
    id: 'latestFinancialMovements',
    title: 'Últimos movimientos financieros',
    description: 'Ventas, gastos, cancelaciones y movimientos docentes.',
    enabled: false,
    order: 11,
    size: 'large',
  },
  {
    id: 'cancelledClassesWithReason',
    title: 'Clases canceladas con motivo',
    description: 'Últimas sesiones canceladas y su motivo.',
    enabled: false,
    order: 12,
    size: 'large',
  },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private classesService = inject(ClassesService);
  private financesService = inject(FinancesService);
  private membershipsService = inject(MembershipsService);
  private rentalsService = inject(RentalsService);
  private reservationsService = inject(ReservationsService);
  private storeService = inject(StoreService);
  private studentsService = inject(StudentsService);
  private teacherPaymentsService = inject(TeacherPaymentsService);

  students = signal<Student[]>([]);
  classes = signal<AticoClass[]>([]);
  memberships = signal<any[]>([]);
  reservations = signal<ReservationItem[]>([]);
  rentals = signal<Rental[]>([]);
  products = signal<StoreProduct[]>([]);
  financesToday = signal<FinanceSummary | null>(null);
  financesMonth = signal<FinanceSummary | null>(null);
  financesAll = signal<FinanceSummary | null>(null);
  teacherPayments = signal<TeacherPaymentsSummary | null>(null);

  loading = signal(true);
  errorMessage = signal('');
  customizeOpen = signal(false);
  gadgets = signal<DashboardGadgetConfig[]>(this.loadGadgetConfig());
  draftGadgets = signal<DashboardGadgetConfig[]>([]);

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      students: this.studentsService.getAll().pipe(catchError(() => of([] as Student[]))),
      classes: this.classesService.getAll().pipe(catchError(() => of([] as AticoClass[]))),
      memberships: this.membershipsService.getAll().pipe(catchError(() => of([] as any[]))),
      reservations: this.reservationsService.list({ period: 'all' }).pipe(catchError(() => of([] as ReservationItem[]))),
      rentals: this.rentalsService.getAll().pipe(catchError(() => of([] as Rental[]))),
      products: this.storeService.getProducts().pipe(catchError(() => of([] as StoreProduct[]))),
      financesToday: this.financesService.getSummary('today').pipe(catchError(() => of(null))),
      financesMonth: this.financesService.getSummary('this-month').pipe(catchError(() => of(null))),
      financesAll: this.financesService.getSummary('all').pipe(catchError(() => of(null))),
      teacherPayments: this.teacherPaymentsService.getSummary({ period: 'all' }).pipe(catchError(() => of(null))),
    }).subscribe({
      next: (data) => {
        this.students.set(data.students || []);
        this.classes.set(data.classes || []);
        this.memberships.set(data.memberships || []);
        this.reservations.set(data.reservations || []);
        this.rentals.set(data.rentals || []);
        this.products.set(data.products || []);
        this.financesToday.set(data.financesToday);
        this.financesMonth.set(data.financesMonth);
        this.financesAll.set(data.financesAll);
        this.teacherPayments.set(data.teacherPayments);
        this.loading.set(false);
      },
      error: (error) => {
        console.error(error);
        this.errorMessage.set('No se pudo cargar el dashboard.');
        this.loading.set(false);
      },
    });
  }

  enabledGadgets(): DashboardGadgetConfig[] {
    return this.sortGadgets(this.gadgets()).filter((item) => item.enabled);
  }

  openCustomize(): void {
    this.draftGadgets.set(this.cloneConfig(this.sortGadgets(this.gadgets())));
    this.customizeOpen.set(true);
  }

  closeCustomize(): void {
    this.customizeOpen.set(false);
  }

  toggleDraftGadget(id: DashboardGadgetId, checked: boolean): void {
    this.draftGadgets.set(
      this.draftGadgets().map((item) =>
        item.id === id ? { ...item, enabled: checked } : item,
      ),
    );
  }

  moveDraftGadget(id: DashboardGadgetId, direction: -1 | 1): void {
    const items = this.cloneConfig(this.draftGadgets());
    const index = items.findIndex((item) => item.id === id);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) {
      return;
    }

    const [item] = items.splice(index, 1);
    items.splice(nextIndex, 0, item);
    this.draftGadgets.set(this.withOrder(items));
  }

  saveCustomize(): void {
    const next = this.withOrder(this.draftGadgets());
    this.gadgets.set(next);
    this.saveGadgetConfig(next);
    this.customizeOpen.set(false);
  }

  restoreDefault(): void {
    const defaults = this.cloneConfig(DEFAULT_DASHBOARD_GADGETS);
    this.gadgets.set(defaults);
    this.draftGadgets.set(this.cloneConfig(defaults));
    this.saveGadgetConfig(defaults);
  }

  trackGadget(index: number, gadget: DashboardGadgetConfig): string {
    return gadget.id;
  }

  getSalesTodayTotal(): number {
    return Number(this.financesToday()?.totals?.grossIncome || 0);
  }

  getSalesTodayCount(): number {
    return (this.financesToday()?.sales || [])
      .filter((sale) => sale.status !== 'CANCELLED')
      .length;
  }

  getMonthRevenue(): number {
    return Number(this.financesMonth()?.totals?.grossIncome || 0);
  }

  getActiveStudentsCount(): number {
    return this.students().filter((student) => {
      return student.status === 'ACTIVO' && !student.deletedAt;
    }).length;
  }

  getTodaySessions(): SessionSummary[] {
    return this.getAllSessions()
      .filter((session) => this.isToday(session.date) && session.status !== 'CANCELLED')
      .sort((a, b) => this.compareSessionDate(a, b));
  }

  getUpcomingSessions(limit = 6): SessionSummary[] {
    const now = new Date();

    return this.getAllSessions()
      .filter((session) => {
        return session.status !== 'CANCELLED' &&
          this.getSessionDateTime(session).getTime() >= now.getTime();
      })
      .sort((a, b) => this.compareSessionDate(a, b))
      .slice(0, limit);
  }

  getRecentCancellations(limit = 8): CancellationSummary[] {
    const cancellations: CancellationSummary[] = [
      ...this.getCancelledClassSessions().map((session) => ({
        id: `session-${session.id}`,
        date: session.date,
        type: 'Clase',
        title: session.classTitle,
        reason: session.cancellationReason || 'Sin motivo registrado',
        severity: session.cancellationReason ? 'normal' as const : 'warning' as const,
      })),
      ...this.getCancelledSales().map((sale) => ({
        id: `sale-${sale.id}`,
        date: sale.cancelledAt || sale.createdAt,
        type: 'Venta',
        title: sale.folio || sale.id,
        reason: sale.cancelReason || 'Sin motivo registrado',
        severity: sale.cancelReason ? 'normal' as const : 'warning' as const,
      })),
      ...this.reservations()
        .filter((reservation) => reservation.status === 'CANCELLED')
        .map((reservation) => ({
          id: `reservation-${reservation.id}`,
          date: reservation.cancelledAt || reservation.createdAt,
          type: 'Reservación',
          title: reservation.className || reservation.session?.id || 'Reservación',
          reason: reservation.cancellationReason || 'Sin motivo registrado',
          severity: reservation.cancellationReason ? 'normal' as const : 'warning' as const,
        })),
    ];

    return cancellations
      .filter((item) => Boolean(item.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  getCancelledClassSessions(limit = 6): SessionSummary[] {
    return this.getAllSessions()
      .filter((session) => session.status === 'CANCELLED')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  getTeacherPaymentTotal(): number {
    return Number(this.teacherPayments()?.totals?.teacherPaymentTotal || 0);
  }

  getTeacherPaymentTeacherCount(): number {
    return Number(this.teacherPayments()?.totals?.teachersCount || 0);
  }

  getExpiringPackages(limit = 6): any[] {
    const today = this.startOfDay(new Date());
    const limitDate = this.startOfDay(new Date());
    limitDate.setDate(today.getDate() + 7);

    return this.memberships()
      .filter((membership) => {
        const expiration = new Date(membership.expirationDate);
        return membership.status === 'ACTIVE' &&
          expiration >= today &&
          expiration <= limitDate;
      })
      .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime())
      .slice(0, limit);
  }

  getLowStockProducts(limit = 6): StoreProduct[] {
    return this.products()
      .filter((product) => product.active && Number(product.stock || 0) <= 5)
      .sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0))
      .slice(0, limit);
  }

  getUpcomingRentals(limit = 6): Rental[] {
    const now = new Date();

    return this.rentals()
      .filter((rental) => new Date(rental.startDate).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, limit);
  }

  getLatestFinancialMovements(limit = 8): FinancialMovement[] {
    const finance = this.financesAll();
    const movements: FinancialMovement[] = [];

    for (const sale of finance?.sales || []) {
      movements.push({
        id: `sale-${sale.id}`,
        date: sale.cancelledAt || sale.createdAt,
        title: sale.status === 'CANCELLED' ? 'Venta cancelada' : 'Venta POS',
        description: sale.folio || sale.saleType,
        amount: Number(sale.total || 0),
        status: sale.status,
        kind: sale.status === 'CANCELLED' ? 'cancelled' : 'income',
      });
    }

    for (const expense of finance?.expenses || []) {
      movements.push({
        id: `expense-${expense.id}`,
        date: expense.date || expense.createdAt,
        title: 'Gasto',
        description: expense.concept,
        amount: Number(expense.amount || 0),
        kind: 'expense',
      });
    }

    for (const item of finance?.teacherPaymentMovements || []) {
      movements.push({
        id: `teacher-${item.id}`,
        date: item.date,
        title: item.concept,
        description: item.observation || item.teacherName,
        amount: Number(item.amount || 0),
        status: item.status,
        kind: item.type === 'INFO' ? 'info' : 'expense',
      });
    }

    return movements
      .filter((item) => Boolean(item.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }

  getGadgetClass(gadget: DashboardGadgetConfig): string {
    return `dashboard-gadget ${gadget.size}`;
  }

  getActivityTypeLabel(type?: string | null): string {
    const labels: Record<string, string> = {
      CLASS: 'Clase',
      COURSE: 'Curso',
      WORKSHOP: 'Taller',
      EVENT: 'Evento',
      RENTAL: 'Renta',
    };

    return labels[type || ''] || 'Actividad';
  }

  formatDate(value?: string | null): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDateTime(value?: string | null): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatSessionDate(session: SessionSummary): string {
    return `${this.formatDate(session.date)} · ${session.startTime} - ${session.endTime}`;
  }

  formatRentalDate(rental: Rental): string {
    return `${this.formatDateTime(rental.startDate)} - ${this.formatTime(rental.endDate)}`;
  }

  formatTime(value?: string | null): string {
    if (!value) return 'Sin hora';

    return new Date(value).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private getAllSessions(): SessionSummary[] {
    return this.classes().flatMap((activity) => {
      return (activity.sessions || []).map((session: ClassSession) => ({
        id: session.id,
        classTitle: activity.title || activity.course?.name || 'Actividad',
        type: activity.type,
        teacherName: activity.teacher?.name || 'Sin maestro',
        roomName: activity.room?.name || 'Sin salón',
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        cancellationReason: session.cancellationReason || null,
      }));
    });
  }

  private getCancelledSales() {
    return (this.financesAll()?.sales || []).filter((sale) => sale.status === 'CANCELLED');
  }

  private compareSessionDate(a: SessionSummary, b: SessionSummary): number {
    return this.getSessionDateTime(a).getTime() - this.getSessionDateTime(b).getTime();
  }

  private getSessionDateTime(session: SessionSummary): Date {
    const date = new Date(session.date);
    const [hours, minutes] = String(session.startTime || '00:00').split(':').map(Number);
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  }

  private isToday(value: string): boolean {
    const date = new Date(value);
    const today = new Date();

    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  }

  private startOfDay(date: Date): Date {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  private sortGadgets(items: DashboardGadgetConfig[]): DashboardGadgetConfig[] {
    return this.cloneConfig(items).sort((a, b) => a.order - b.order);
  }

  private withOrder(items: DashboardGadgetConfig[]): DashboardGadgetConfig[] {
    return items.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
  }

  private loadGadgetConfig(): DashboardGadgetConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return this.cloneConfig(DEFAULT_DASHBOARD_GADGETS);
      }

      const saved = JSON.parse(raw) as Partial<DashboardGadgetConfig>[];
      const merged = DEFAULT_DASHBOARD_GADGETS.map((item) => {
        const match = saved.find((savedItem) => savedItem.id === item.id);
        return {
          ...item,
          enabled: match?.enabled ?? item.enabled,
          order: match?.order ?? item.order,
          size: match?.size ?? item.size,
        };
      });

      return this.withOrder(this.sortGadgets(merged));
    } catch {
      return this.cloneConfig(DEFAULT_DASHBOARD_GADGETS);
    }
  }

  private saveGadgetConfig(config: DashboardGadgetConfig[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }

  private cloneConfig(config: DashboardGadgetConfig[]): DashboardGadgetConfig[] {
    return config.map((item) => ({ ...item }));
  }
}
