import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  BarController,
  DoughnutController,
  Tooltip,
  Legend
} from 'chart.js';

import {
  FinancePeriodFilter,
  FinanceSummary,
  FinancesService
} from '../../core/services/finances.service';
import {
  PosSale,
  PosSaleItem,
  PosService,
} from '../../core/services/pos.service';
import { printTicketFromElement } from '../../shared/print-ticket.util';

type FinanceMovementTypeFilter = 'ALL' | 'INCOME' | 'EXPENSE' | 'CANCELLATION' | 'NO_IMPACT';
type FinanceStatusFilter = 'ALL' | 'ACTIVE' | 'CANCELLED';
type FinanceSortField = 'date' | 'amount' | 'concept' | 'status' | 'type' | 'buyer' | 'teacher';
type SortDirection = 'asc' | 'desc';

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  BarController,
  DoughnutController,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-finances',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './finances.component.html',
  styleUrl: './finances.component.scss'
})
export class FinancesComponent implements OnInit, AfterViewInit, OnDestroy {
  private financesService = inject(FinancesService);
  private posService = inject(PosService);

  @ViewChild('summaryChart') summaryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('packageChart') packageChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ticketPrintArea') ticketPrintArea?: ElementRef<HTMLElement>;

  summary = signal<FinanceSummary | null>(null);
  selectedSale = signal<PosSale | null>(null);
  periodFilter = signal<FinancePeriodFilter>('all');
  loading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');
  cancellingSaleId = signal<string | null>(null);
  financeSearch = signal('');
  movementTypeFilter = signal<FinanceMovementTypeFilter>('ALL');
  saleStatusFilter = signal<FinanceStatusFilter>('ALL');
  financeFromFilter = signal('');
  financeToFilter = signal('');
  financeSortField = signal<FinanceSortField>('date');
  financeSortDirection = signal<SortDirection>('desc');
  filtersOpen = signal(false);

  filteredTeacherMovements = computed(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    return summary.teacherPaymentMovements
      .filter((item) => this.matchesFinanceMovement(item))
      .sort((a, b) => this.compareFinanceRows(a, b));
  });

  filteredSales = computed(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    return summary.sales
      .filter((sale) => this.matchesSale(sale))
      .sort((a, b) => this.compareSales(a, b));
  });

  private summaryChart?: Chart;
  private packageChart?: Chart;

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.summaryChart?.destroy();
    this.packageChart?.destroy();
  }

  loadData(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.financesService.getSummary(this.periodFilter()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.selectedSale.set(summary.sales?.[0] || null);
        this.loading.set(false);
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('No se pudo cargar el resumen financiero.');
        this.loading.set(false);
      }
    });
  }

  changePeriod(period: FinancePeriodFilter): void {
    this.periodFilter.set(period);
    this.loadData();
  }

  selectSale(sale: PosSale): void {
    this.selectedSale.set(sale);
  }

  printSelectedTicket(): void {
    const element = this.ticketPrintArea?.nativeElement;

    if (!element) {
      this.errorMessage.set('No se encontró el ticket para imprimir.');
      return;
    }

    const opened = printTicketFromElement(element);

    if (!opened) {
      this.errorMessage.set('Permite ventanas emergentes para imprimir el ticket.');
    }
  }

  cancelSale(sale: PosSale): void {
    if (this.isSaleCancelled(sale)) {
      this.errorMessage.set('La venta ya está cancelada.');
      return;
    }

    const confirmed = window.confirm(
      '¿Seguro que deseas cancelar esta compra? Esta acción anulará el ingreso y el pago al maestro relacionado.',
    );

    if (!confirmed) {
      return;
    }

    const reason = window.prompt('Motivo de cancelación');

    if (!reason || reason.trim().length < 3) {
      this.errorMessage.set('Captura un motivo de cancelación de al menos 3 caracteres.');
      return;
    }

    this.cancellingSaleId.set(sale.id);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.posService.cancelSale(sale.id, reason.trim()).subscribe({
      next: (response) => {
        this.cancellingSaleId.set(null);
        this.successMessage.set(response.message || 'Venta cancelada correctamente.');
        this.loadData();
      },
      error: (err) => {
        console.error(err);
        this.cancellingSaleId.set(null);
        this.errorMessage.set(this.getApiErrorMessage(err, 'No se pudo cancelar la venta.'));
      },
    });
  }

  clearFinanceFilters(): void {
    this.financeSearch.set('');
    this.movementTypeFilter.set('ALL');
    this.saleStatusFilter.set('ALL');
    this.financeFromFilter.set('');
    this.financeToFilter.set('');
    this.financeSortField.set('date');
    this.financeSortDirection.set('desc');
  }

  toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  setSort(field: FinanceSortField): void {
    if (this.financeSortField() === field) {
      this.financeSortDirection.set(this.financeSortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.financeSortField.set(field);
    this.financeSortDirection.set('asc');
  }

  getSortIcon(field: FinanceSortField): string {
    if (this.financeSortField() !== field) {
      return '↕';
    }

    return this.financeSortDirection() === 'asc' ? '↑' : '↓';
  }

  getActiveFinanceFiltersCount(): number {
    return [
      this.financeSearch(),
      this.movementTypeFilter() !== 'ALL' ? this.movementTypeFilter() : '',
      this.saleStatusFilter() !== 'ALL' ? this.saleStatusFilter() : '',
      this.financeFromFilter(),
      this.financeToFilter(),
    ].filter(Boolean).length;
  }

  private matchesFinanceMovement(item: FinanceSummary['teacherPaymentMovements'][number]): boolean {
    const term = this.normalizeSearch(this.financeSearch());
    const searchable = this.normalizeSearch([
      item.concept,
      item.teacherName,
      item.className,
      item.observation,
      item.cancellationReason,
      item.source,
      item.status,
    ].join(' '));

    if (term && !searchable.includes(term)) {
      return false;
    }

    if (!this.isWithinFinanceDateRange(item.date)) {
      return false;
    }

    const type = this.movementTypeFilter();

    if (type === 'EXPENSE' && item.type !== 'EXPENSE') return false;
    if (type === 'CANCELLATION' && !item.cancellationType) return false;
    if (type === 'NO_IMPACT' && item.type !== 'INFO') return false;
    if (type === 'INCOME') return false;

    return true;
  }

  private matchesSale(sale: PosSale): boolean {
    const term = this.normalizeSearch(this.financeSearch());
    const searchable = this.normalizeSearch([
      this.getSaleFolio(sale),
      this.getSaleStudentName(sale),
      sale.saleType,
      sale.status,
      sale.items?.map((item) => item.name).join(' '),
    ].join(' '));

    if (term && !searchable.includes(term)) {
      return false;
    }

    if (!this.isWithinFinanceDateRange(sale.createdAt)) {
      return false;
    }

    if (this.movementTypeFilter() === 'EXPENSE' || this.movementTypeFilter() === 'NO_IMPACT') {
      return false;
    }

    if (this.movementTypeFilter() === 'CANCELLATION' && !this.isSaleCancelled(sale)) {
      return false;
    }

    if (this.saleStatusFilter() === 'ACTIVE' && this.isSaleCancelled(sale)) {
      return false;
    }

    if (this.saleStatusFilter() === 'CANCELLED' && !this.isSaleCancelled(sale)) {
      return false;
    }

    return true;
  }

  private isWithinFinanceDateRange(value: string | null | undefined): boolean {
    const time = value ? new Date(value).getTime() : 0;
    const from = this.financeFromFilter() ? new Date(`${this.financeFromFilter()}T00:00:00`).getTime() : null;
    const to = this.financeToFilter() ? new Date(`${this.financeToFilter()}T23:59:59`).getTime() : null;

    if (from && time < from) return false;
    if (to && time > to) return false;

    return true;
  }

  private compareFinanceRows(
    a: FinanceSummary['teacherPaymentMovements'][number],
    b: FinanceSummary['teacherPaymentMovements'][number],
  ): number {
    const direction = this.financeSortDirection() === 'asc' ? 1 : -1;
    const field = this.financeSortField();
    let result = 0;

    if (field === 'amount') {
      result = Number(a.amount || 0) - Number(b.amount || 0);
    } else if (field === 'concept') {
      result = String(a.concept || '').localeCompare(String(b.concept || ''), 'es');
    } else if (field === 'status') {
      result = String(a.status || '').localeCompare(String(b.status || ''), 'es');
    } else if (field === 'type') {
      result = String(a.type || '').localeCompare(String(b.type || ''), 'es');
    } else if (field === 'teacher') {
      result = String(a.teacherName || '').localeCompare(String(b.teacherName || ''), 'es');
    } else {
      result = new Date(a.date).getTime() - new Date(b.date).getTime();
    }

    return result * direction;
  }

  private compareSales(a: PosSale, b: PosSale): number {
    const direction = this.financeSortDirection() === 'asc' ? 1 : -1;
    const field = this.financeSortField();
    let result = 0;

    if (field === 'amount') {
      result = Number(a.total || 0) - Number(b.total || 0);
    } else if (field === 'buyer') {
      result = this.getSaleStudentName(a).localeCompare(this.getSaleStudentName(b), 'es');
    } else if (field === 'concept' || field === 'type') {
      result = String(a.saleType || '').localeCompare(String(b.saleType || ''), 'es');
    } else if (field === 'status') {
      result = String(a.status || '').localeCompare(String(b.status || ''), 'es');
    } else {
      result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    return result * direction;
  }

  private normalizeSearch(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  renderCharts(): void {
    this.summaryChart?.destroy();
    this.packageChart?.destroy();

    const summary = this.summary();
    if (!summary) return;

    if (this.summaryChartRef) {
      const rows = summary.chartData.incomeVsExpenses;

      this.summaryChart = new Chart(this.summaryChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: rows.map((item) => item.label),
          datasets: [{
            label: 'MXN',
            data: rows.map((item) => Number(item.value || 0)),
            backgroundColor: ['#f59e0b', '#38bdf8', '#64748b', '#0f172a', '#22c55e'],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    if (this.packageChartRef) {
      const sales = this.getPackageSales().slice(0, 6);

      this.packageChart = new Chart(this.packageChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: sales.map(item => item.productName),
          datasets: [{
            data: sales.map(item => item.income),
            backgroundColor: ['#f59e0b', '#facc15', '#111827', '#94a3b8', '#86efac', '#38bdf8'],
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
  }

  getTotalCreditsSold(): number {
    return Number(this.summary()?.totals.creditsSold || 0);
  }

  getPackageSales(): any[] {
    return this.summary()?.productDistribution || [];
  }

  getMaxPackageIncome(): number {
    return Math.max(...this.getPackageSales().map(item => item.income), 1);
  }

  getPackageBarWidth(item: any): number {
    return Math.max((Number(item.income || 0) / this.getMaxPackageIncome()) * 100, 4);
  }

  getMaxExpenseAmount(): number {
    return Math.max(...(this.summary()?.expenseDistribution || []).map(item => item.amount), 1);
  }

  getExpenseBarWidth(item: any): number {
    return Math.max((Number(item.amount || 0) / this.getMaxExpenseAmount()) * 100, 4);
  }

  getActiveMemberships(): number {
    return this.summary()?.latestAcademicSales.filter((item) => item.status === 'ACTIVE').length || 0;
  }

  getProfitMargin(): number {
    return Number(this.summary()?.totals.margin || 0);
  }

  getAverageIncomePerMembership(): number {
    return Number(this.summary()?.totals.averageAcademicSale || 0);
  }

  getTeacherMovementBadgeLabel(item: FinanceSummary['teacherPaymentMovements'][number]): string {
    if (item.status === 'CANCELLED_WITH_PAYMENT') return 'Cancelada con pago';
    if (item.status === 'CANCELLED_WITHOUT_PAYMENT') return 'Sin impacto';
    if (item.status === 'DIRECT_COMMISSION') return 'Comisión directa';
    return 'Clase realizada';
  }

  getTeacherMovementBadgeClass(item: FinanceSummary['teacherPaymentMovements'][number]): string {
    if (item.status === 'CANCELLED_WITH_PAYMENT') return 'cancelled-paid';
    if (item.status === 'CANCELLED_WITHOUT_PAYMENT') return 'no-impact';
    if (item.status === 'DIRECT_COMMISSION') return 'direct-commission';
    return 'completed-class';
  }

  getTeacherMovementDetail(item: FinanceSummary['teacherPaymentMovements'][number]): string {
    if (item.cancellationReason) {
      return `Motivo: ${item.cancellationReason}`;
    }

    if (item.status === 'CANCELLED_WITHOUT_PAYMENT') {
      return 'Cancelación auditable sin egreso.';
    }

    if (item.status === 'CANCELLED_WITH_PAYMENT') {
      return 'Cancelación operativa con mínimo garantizado.';
    }

    if (item.status === 'DIRECT_COMMISSION') {
      return item.observation || 'Comisión por venta directa.';
    }

    return `${Number(item.attendeesCount || 0)} asistente(s) confirmados.`;
  }

  getPeriodLabel(): string {
    const period = this.summary()?.period;

    if (!period) return 'Todo el histórico';
    if (period.key === 'today') return 'Hoy';
    if (period.key === 'this-month') return 'Este mes';
    if (period.key === 'last-30-days') return 'Últimos 30 días';
    if (!period.from && !period.to) return 'Todo el histórico';

    return `${this.formatDate(period.from)} a ${this.formatDate(period.to)}`;
  }

  getAreaLabel(area: string | null | undefined): string {
    if (area === 'MUSIC') return 'Música';
    if (area === 'BOTH') return 'Danza y Música';
    return 'Danza';
  }

  getSaleFolio(sale: PosSale): string {
    return sale.folio || sale.id;
  }

  getSaleTypeLabel(type: string): string {
    if (type === 'STORE') return 'Tienda';
    if (type === 'MIXED') return 'Mixta';
    return 'Académica';
  }

  getSaleStudentName(sale: PosSale): string {
    return sale.student?.name || this.getTicketAssistantName(sale) || 'Venta general';
  }

  isSaleCancelled(sale: PosSale): boolean {
    return sale.status === 'CANCELLED';
  }

  getTicketAssistantName(sale: PosSale): string {
    return sale.student?.name || this.getFirstItemValue(sale, 'participantName');
  }

  getTicketEmail(sale: PosSale): string {
    return this.getFirstItemValue(sale, 'participantEmail') || sale.student?.email || '';
  }

  getTicketPhone(sale: PosSale): string {
    return this.getFirstItemValue(sale, 'participantPhone') || sale.student?.phone || '';
  }

  getTicketConceptLabel(item: PosSaleItem): string {
    const folio = item.ticketFolio || '';
    const quantity = Number(item.quantity || 1);
    const base = folio ? `${item.name} (${folio})` : item.name;

    return quantity > 1 ? `${base} x${quantity}` : base;
  }

  getTicketLineTotal(item: PosSaleItem): number {
    return Number(item.total || 0);
  }

  private getFirstItemValue(sale: PosSale, key: 'participantName' | 'participantEmail' | 'participantPhone'): string {
    const item = sale.items?.find((entry) => Boolean((entry as any)[key]));
    return item ? String((item as any)[key] || '') : '';
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return message || fallback;
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
