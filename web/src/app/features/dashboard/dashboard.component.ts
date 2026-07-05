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
import { HttpClient } from '@angular/common/http';

import {
  Chart,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  BarController,
  DoughnutController,
  Tooltip,
  Legend
} from 'chart.js';

Chart.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  BarController,
  DoughnutController,
  Tooltip,
  Legend
);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);

  @ViewChild('incomeChart') incomeChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('incomeMixChart') incomeMixChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('membershipChart') membershipChartRef!: ElementRef<HTMLCanvasElement>;

  students = signal<any[]>([]);
  classes = signal<any[]>([]);
  memberships = signal<any[]>([]);
  reservations = signal<any[]>([]);
  loading = signal(true);
  incomeRange = signal<'week' | 'month' | 'sixMonths' | 'year'>('sixMonths');

  private incomeChart?: Chart;
  private incomeMixChart?: Chart;
  private membershipChart?: Chart;

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.incomeChart?.destroy();
    this.incomeMixChart?.destroy();
    this.membershipChart?.destroy();
  }

  loadDashboard(): void {
    this.loading.set(true);

    Promise.all([
      this.http.get<any[]>('http://localhost:3004/api/students').toPromise(),
      this.http.get<any[]>('http://localhost:3004/api/classes').toPromise(),
      this.http.get<any[]>('http://localhost:3004/api/memberships').toPromise(),
      this.http.get<any[]>('http://localhost:3004/api/reservations').toPromise()
    ]).then(([students, classes, memberships, reservations]) => {
      this.students.set(students || []);
      this.classes.set(classes || []);
      this.memberships.set(memberships || []);
      this.reservations.set(reservations || []);
      this.loading.set(false);

      setTimeout(() => this.renderCharts(), 100);
    }).catch((err) => {
      console.error(err);
      this.loading.set(false);
    });
  }

  renderCharts(): void {
    this.incomeChart?.destroy();
    this.incomeMixChart?.destroy();
    this.membershipChart?.destroy();

    this.renderIncomeChart();
    this.renderIncomeMixChart();
    this.renderMembershipChart();
  }

  renderIncomeChart(): void {
    if (!this.incomeChartRef) return;

    const points = this.getIncomeTrendPoints();
    const data = points.map(point => point.amount);

    this.incomeChart = new Chart(this.incomeChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: points.map(item => item.label),
        datasets: [{
          label: 'Ingresos',
          data,
          tension: 0.35,
          fill: false
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

  renderIncomeMixChart(): void {
    if (!this.incomeMixChartRef) return;

    const mix = this.getIncomeMix();

    this.incomeMixChart = new Chart(this.incomeMixChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: mix.map(item => item.label),
        datasets: [{
          data: mix.map(item => item.amount)
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

  renderMembershipChart(): void {
    if (!this.membershipChartRef) return;

    this.membershipChart = new Chart(this.membershipChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: ['Activas', 'Canceladas', 'Por vencer', 'Sin créditos'],
        datasets: [{
          label: 'Membresías',
          data: [
            this.getActiveMemberships(),
            this.getCancelledMemberships(),
            this.getMembershipsExpiringSoon().length,
            this.getStudentsWithoutCredits()
          ]
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
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
  }

  isToday(value: string): boolean {
    const date = new Date(value);
    const today = new Date();

    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  }

  isThisMonth(value: string): boolean {
    const date = new Date(value);
    const today = new Date();

    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth();
  }


  setIncomeRange(range: 'week' | 'month' | 'sixMonths' | 'year'): void {
    this.incomeRange.set(range);
    setTimeout(() => this.renderCharts(), 50);
  }

  getIncomeTrendPoints(): { label: string; amount: number }[] {
    const range = this.incomeRange();

    if (range === 'week') {
      return this.getLastDays(7).map(day => ({
        label: day.label,
        amount: this.getIncomeByDate(day.date)
      }));
    }

    if (range === 'month') {
      return this.getLastDays(30).map(day => ({
        label: day.label,
        amount: this.getIncomeByDate(day.date)
      }));
    }

    if (range === 'year') {
      return this.getLastMonths(12).map(month => ({
        label: month.label,
        amount: this.getIncomeByMonth(month.year, month.month)
      }));
    }

    return this.getLastMonths(6).map(month => ({
      label: month.label,
      amount: this.getIncomeByMonth(month.year, month.month)
    }));
  }

  getLastDays(days: number): { date: Date; label: string }[] {
    const result = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      result.push({
        date,
        label: date.toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short'
        })
      });
    }

    return result;
  }

  getLastMonths(monthsCount: number) {
    const result = [];
    const today = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);

      result.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleDateString('es-MX', {
          month: 'short',
          year: monthsCount > 6 ? '2-digit' : undefined
        })
      });
    }

    return result;
  }

  getIncomeByDate(targetDate: Date): number {
    return this.students().reduce((total, student) => {
      return total + (student.payments || [])
        .filter((payment: any) => {
          const date = new Date(payment.createdAt);

          return date.getFullYear() === targetDate.getFullYear()
            && date.getMonth() === targetDate.getMonth()
            && date.getDate() === targetDate.getDate();
        })
        .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    }, 0);
  }


  getLastSixMonths() {
    const result = [];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);

      result.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: date.toLocaleDateString('es-MX', { month: 'short' })
      });
    }

    return result;
  }

  getIncomeByMonth(year: number, month: number): number {
    return this.students().reduce((total, student) => {
      return total + (student.payments || [])
        .filter((payment: any) => {
          const date = new Date(payment.createdAt);
          return date.getFullYear() === year && date.getMonth() === month;
        })
        .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    }, 0);
  }

  getIncomeMix() {
    const result = [
      { label: 'Paquetes', amount: 0 },
      { label: 'Inscripción', amount: 0 },
      { label: 'Day Pass', amount: 0 },
      { label: 'Otros', amount: 0 }
    ];

    for (const student of this.students()) {
      for (const payment of student.payments || []) {
        const concept = payment.concept;

        if (concept === 'PAQUETE') result[0].amount += Number(payment.amount || 0);
        else if (concept === 'INSCRIPCION') result[1].amount += Number(payment.amount || 0);
        else if (concept === 'DAY_PASS') result[2].amount += Number(payment.amount || 0);
        else result[3].amount += Number(payment.amount || 0);
      }
    }

    return result.filter(item => item.amount > 0);
  }

  getTodayClasses(): any[] {
    return this.classes().filter((item) => this.isToday(item.startDate));
  }

  getTodayExpectedStudents(): number {
    return this.getTodayClasses().reduce((total, item) => {
      return total + (item.reservations || []).filter((reservation: any) => {
        return ['RESERVED', 'CONFIRMED', 'ATTENDED'].includes(reservation.status);
      }).length;
    }, 0);
  }

  getTodayAttendances(): number {
    return this.getTodayClasses().reduce((total, item) => {
      return total + (item.attendances || []).length;
    }, 0);
  }

  getTodayPending(): number {
    return Math.max(this.getTodayExpectedStudents() - this.getTodayAttendances(), 0);
  }

  getMonthlyIncome(): number {
    return this.students().reduce((total, student) => {
      return total + (student.payments || [])
        .filter((payment: any) => this.isThisMonth(payment.createdAt))
        .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    }, 0);
  }

  getActiveMemberships(): number {
    return this.memberships().filter((item) => item.status === 'ACTIVE').length;
  }

  getCancelledMemberships(): number {
    return this.memberships().filter((item) => item.status === 'CANCELLED').length;
  }

  getStudentsWithoutCredits(): number {
    return this.students().filter((student) => {
      const credits = (student.memberships || []).reduce((total: number, membership: any) => {
        if (membership.status !== 'ACTIVE') return total;
        return total + Number(membership.availableCredits || 0);
      }, 0);

      return student.enrolled && credits <= 0;
    }).length;
  }

  getMembershipsExpiringSoon(): any[] {
    const today = new Date();
    const limit = new Date();
    limit.setDate(today.getDate() + 7);

    return this.memberships().filter((membership) => {
      const expiration = new Date(membership.expirationDate);

      return membership.status === 'ACTIVE'
        && expiration >= today
        && expiration <= limit;
    });
  }

  getFullClasses(): any[] {
    return this.classes().filter((item) => {
      const reservations = (item.reservations || []).filter((reservation: any) => {
        return ['RESERVED', 'CONFIRMED', 'ATTENDED'].includes(reservation.status);
      }).length;

      return reservations >= Number(item.capacity || 0);
    });
  }

  getUpcomingClasses(): any[] {
    const now = new Date();

    return this.classes()
      .filter((item) => new Date(item.startDate) >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  }

  getRecentActivity(): any[] {
    const items: any[] = [];

    for (const student of this.students()) {
      for (const payment of student.payments || []) {
        items.push({
          date: payment.createdAt,
          icon: '💰',
          title: 'Pago registrado',
          description: `${student.name} · $${payment.amount}`
        });
      }

      for (const membership of student.memberships || []) {
        items.push({
          date: membership.createdAt,
          icon: '💳',
          title: 'Producto académico vendido',
          description: `${student.name} · ${membership.package?.name || 'Paquete'}`
        });
      }
    }

    return items
      .filter((item) => item.date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 6);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(value: string): string {
    return new Date(value).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
