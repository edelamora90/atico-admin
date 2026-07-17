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
import { FormsModule } from '@angular/forms';

import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js';

import {
  CashCutSummary,
  CashRegisterClose,
  PosSaleItem,
  PosSale,
  PosService
} from '../../core/services/pos.service';
import { printTicketFromElement } from '../../shared/print-ticket.util';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip
);

type CashCutFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type AlertType = 'success' | 'error' | 'warning' | 'info';

interface UiAlert {
  type: AlertType;
  message: string;
}

@Component({
  selector: 'app-cash-cut',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cash-cut.component.html',
  styleUrl: './cash-cut.component.scss'
})
export class CashCutComponent implements OnInit, AfterViewInit, OnDestroy {
  private posService = inject(PosService);

  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('conceptChart') conceptChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ticketPrintArea') ticketPrintArea?: ElementRef<HTMLElement>;

  summary = signal<CashCutSummary | null>(null);
  selectedSale = signal<PosSale | null>(null);
  loading = signal(true);
  errorMessage = signal('');
  cashCloseAlert = signal<UiAlert | null>(null);
  cashCloses = signal<CashRegisterClose[]>([]);
  cashCloseSaving = signal(false);
  cancellingSaleId = signal<string | null>(null);
  cashCloseCountedAmount = signal<number | null>(null);
  cashCloseNotes = signal('');
  cashCloseClosedByName = signal('');
  cashCloseReviewedByName = signal('');

  activeFilter = signal<CashCutFilter>('today');
  customFrom = signal('');
  customTo = signal('');

  private typeChart?: Chart;
  private conceptChart?: Chart;
  private chartsReady = false;

  ngOnInit(): void {
    this.setDefaultCustomRange();
    this.loadCashCut();
  }

  ngAfterViewInit(): void {
    this.chartsReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.typeChart?.destroy();
    this.conceptChart?.destroy();
  }

  loadCashCut(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.posService.getCashCut(this.getQueryParams()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.selectedSale.set(summary.sales[0] || null);
        this.loading.set(false);
        this.loadCashCloses();
        setTimeout(() => this.renderCharts(), 50);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set('No se pudo cargar el corte de caja.');
        this.loading.set(false);
      }
    });
  }

  applyFilter(filter: CashCutFilter): void {
    this.activeFilter.set(filter);
    this.loadCashCut();
  }

  applyCustomRange(): void {
    this.activeFilter.set('custom');
    this.loadCashCut();
  }

  selectSale(sale: PosSale): void {
    this.selectedSale.set(sale);
  }

  printSelectedTicket(): void {
    if (!this.selectedSale()) {
      return;
    }

    const element = this.ticketPrintArea?.nativeElement;

    if (!element) {
      this.cashCloseAlert.set({
        type: 'error',
        message: 'No se encontró el ticket para imprimir.',
      });
      return;
    }

    const opened = printTicketFromElement(element);

    if (!opened) {
      this.cashCloseAlert.set({
        type: 'error',
        message: 'Permite ventanas emergentes para imprimir el ticket.',
      });
    }
  }

  cancelSale(sale: PosSale): void {
    if (sale.status === 'CANCELLED') {
      this.cashCloseAlert.set({ type: 'warning', message: 'La venta ya está cancelada.' });
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
      this.cashCloseAlert.set({
        type: 'warning',
        message: 'Captura un motivo de cancelación de al menos 3 caracteres.',
      });
      return;
    }

    this.cancellingSaleId.set(sale.id);
    this.cashCloseAlert.set(null);

    this.posService.cancelSale(sale.id, reason.trim()).subscribe({
      next: (response) => {
        this.cancellingSaleId.set(null);
        this.cashCloseAlert.set({
          type: 'success',
          message: response.message || 'Venta cancelada correctamente.',
        });
        this.loadCashCut();
      },
      error: (err) => {
        console.error(err);
        this.cancellingSaleId.set(null);
        this.cashCloseAlert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo cancelar la venta.'),
        });
      },
    });
  }


  loadCashCloses(): void {
    this.posService.getCashCloses(this.getQueryParams()).subscribe({
      next: (closes) => {
        this.cashCloses.set(closes);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  getLatestCashClose(): CashRegisterClose | null {
    return this.cashCloses()[0] || null;
  }

  getSaleFolio(sale: PosSale): string {
    return sale.folio || sale.id;
  }

  getExpectedCashAmount(): number {
    return Number(this.summary()?.totalAmount || 0);
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
    const item = sale.items?.find((entry) => {
      return Boolean((entry as any)[key]);
    });

    return item ? String((item as any)[key] || '') : '';
  }

  getCountedAmountValue(): number {
    return Number(this.cashCloseCountedAmount() || 0);
  }

  getCashDifference(): number {
    return this.getCountedAmountValue() - this.getExpectedCashAmount();
  }

  getCashDifferenceClass(): string {
    const diff = this.getCashDifference();

    if (diff === 0) return 'balanced';
    if (diff > 0) return 'positive';

    return 'negative';
  }

  getCashDifferenceLabel(): string {
    const diff = this.getCashDifference();

    if (diff === 0) return 'Caja correcta';
    if (diff > 0) return 'Sobrante';

    return 'Faltante';
  }

  saveCashClose(): void {
    const summary = this.summary();

    if (!summary) {
      this.cashCloseAlert.set({ type: 'error', message: 'No hay corte cargado.' });
      return;
    }

    if (this.cashCloseCountedAmount() === null || this.cashCloseCountedAmount() === undefined) {
      this.cashCloseAlert.set({ type: 'warning', message: 'Captura el efectivo contado.' });
      return;
    }

    this.cashCloseSaving.set(true);
    this.cashCloseAlert.set(null);

    this.posService.createCashClose({
      from: summary.from,
      to: summary.to,
      countedAmount: this.getCountedAmountValue(),
      notes: this.cashCloseNotes(),
      closedByName: this.cashCloseClosedByName(),
      reviewedByName: this.cashCloseReviewedByName(),
    }).subscribe({
      next: () => {
        this.cashCloseSaving.set(false);
        this.cashCloseAlert.set({
          type: 'success',
          message: 'Arqueo de caja guardado correctamente.'
        });
        this.loadCashCloses();
      },
      error: (err) => {
        console.error(err);
        this.cashCloseSaving.set(false);
        this.cashCloseAlert.set({
          type: 'error',
          message: this.getApiErrorMessage(err, 'No se pudo guardar el arqueo.')
        });
      }
    });
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    return message || fallback;
  }


  exportCashCutCsv(): void {
    const summary = this.summary();
    if (!summary) return;

    const headers = [
      'Folio',
      'Fecha',
      'Tipo de venta',
      'Alumno',
      'Producto',
      'Tipo de item',
      'Cantidad',
      'Precio unitario',
      'Total linea',
      'Total ticket',
    ];

    const rows = summary.sales.flatMap((sale) => {
      return sale.items.map((item) => [
        this.getSaleFolio(sale),
        this.formatDate(sale.createdAt),
        this.getSaleTypeLabel(sale.saleType),
        this.getSaleStudentName(sale),
        item.name,
        this.getItemTypeLabel(item.type),
        item.quantity,
        Number(item.unitPrice || 0),
        Number(item.total || 0),
        Number(sale.total || 0),
      ]);
    });

    const csv = [
      headers,
      ...rows,
    ].map((row) => row.map((cell) => this.escapeCsvCell(cell)).join(',')).join('\n');

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.getExportFileName('csv');
    link.click();
    URL.revokeObjectURL(url);
  }

  printCashCut(): void {
    window.print();
  }

  renderCharts(): void {
    if (!this.chartsReady || !this.summary()) return;

    this.typeChart?.destroy();
    this.conceptChart?.destroy();

    const summary = this.summary()!;
    const typeRows = summary.salesByType.filter((item) => item.count > 0);

    if (this.typeChartRef) {
      this.typeChart = new Chart(this.typeChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: typeRows.map((item) => this.getSaleTypeLabel(item.saleType)),
          datasets: [{
            data: typeRows.map((item) => item.amount),
            backgroundColor: ['#111827', '#f59e0b', '#2563eb'],
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

    if (this.conceptChartRef) {
      this.conceptChart = new Chart(this.conceptChartRef.nativeElement, {
        type: 'bar',
        data: {
          labels: ['Tienda', 'Paquetes', 'Inscripción', 'Renovación'],
          datasets: [{
            label: 'MXN',
            data: [
              this.getStoreIncome(summary),
              this.getPackageIncome(summary),
              this.getInscriptionIncome(summary),
              this.getRenewalIncome(summary),
            ],
            backgroundColor: ['#111827', '#f59e0b', '#16a34a', '#2563eb'],
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
  }

  getQueryParams(): Record<string, string> {
    const filter = this.activeFilter();

    if (filter === 'custom') {
      const params: Record<string, string> = {};

      if (this.customFrom()) {
        params['from'] = new Date(`${this.customFrom()}T00:00:00`).toISOString();
      }

      if (this.customTo()) {
        params['to'] = new Date(`${this.customTo()}T23:59:59.999`).toISOString();
      }

      return params;
    }

    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);

    if (filter === 'today') {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    }

    if (filter === 'yesterday') {
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 59, 999);
    }

    if (filter === 'week') {
      const day = from.getDay() || 7;
      from.setDate(from.getDate() - day + 1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    }

    if (filter === 'month') {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  }

  setDefaultCustomRange(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.customFrom.set(today);
    this.customTo.set(today);
  }

  getRangeLabel(): string {
    const summary = this.summary();
    if (!summary) return 'Sin rango';

    return `${this.formatDate(summary.from)} a ${this.formatDate(summary.to)}`;
  }

  getGeneratedAtLabel(): string {
    return new Date().toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  getExportFileName(extension: string): string {
    const summary = this.summary();
    const today = new Date().toISOString().slice(0, 10);

    if (!summary) {
      return `corte-caja-${today}.${extension}`;
    }

    const from = this.getLocalDatePart(summary.from);
    const to = this.getLocalDatePart(summary.to);

    if (from === to) {
      return `corte-caja-${from}.${extension}`;
    }

    return `corte-caja-${from}_a_${to}.${extension}`;
  }

  getLocalDatePart(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getPaymentSummary(item: PosSaleItem): string {
    if (!item.payment) return 'Sin pago relacionado';
    return `${item.payment.concept} · ${this.formatCurrency(item.payment.amount)}`;
  }

  getTotalIncome(summary: CashCutSummary): number {
    return summary.totalIncome ?? summary.totalAmount ?? 0;
  }

  getStoreIncome(summary: CashCutSummary): number {
    return summary.storeIncome ?? summary.storeAmount ?? 0;
  }

  getPackageIncome(summary: CashCutSummary): number {
    return summary.packageIncome ?? summary.academicAmount ?? 0;
  }

  getInscriptionIncome(summary: CashCutSummary): number {
    return summary.inscriptionIncome ?? summary.inscriptionAmount ?? 0;
  }

  getRenewalIncome(summary: CashCutSummary): number {
    return summary.renewalIncome ?? summary.renewalAmount ?? 0;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Number(value || 0));
  }

  escapeCsvCell(value: unknown): string {
    const text = String(value ?? '');
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  getSaleTypeLabel(type: string): string {
    if (type === 'STORE') return 'Tienda';
    if (type === 'MIXED') return 'Mixta';
    return 'Académica';
  }

  getItemTypeLabel(type: string): string {
    if (type === 'STORE') return 'Tienda';
    if (type === 'INSCRIPTION') return 'Inscripción';
    if (type === 'RENEWAL') return 'Renovación';
    return 'Académica';
  }

  getSaleStudentName(sale: PosSale): string {
    return sale.student?.name || 'Venta anónima';
  }

  formatDate(value: string): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }
}
