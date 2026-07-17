import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
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
