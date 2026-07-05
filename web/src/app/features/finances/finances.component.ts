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

  @ViewChild('summaryChart') summaryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('packageChart') packageChartRef!: ElementRef<HTMLCanvasElement>;

  summary = signal<FinanceSummary | null>(null);
  periodFilter = signal<FinancePeriodFilter>('all');
  loading = signal(true);
  errorMessage = signal('');

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

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
