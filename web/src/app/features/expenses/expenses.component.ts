import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  Expense,
  ExpenseCategory,
  ExpensePayload,
  ExpensesService,
} from '../../core/services/expenses.service';
import { FinancePeriodFilter } from '../../core/services/finances.service';

interface ExpenseCategoryOption {
  value: ExpenseCategory | 'ALL';
  label: string;
}

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent implements OnInit {
  private expensesService = inject(ExpensesService);
  private fb = inject(FormBuilder);

  expenses = signal<Expense[]>([]);
  loading = signal(true);
  saving = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  periodFilter = signal<FinancePeriodFilter>('this-month');
  categoryFilter = signal<ExpenseCategory | 'ALL'>('ALL');
  showForm = signal(false);
  editingExpense = signal<Expense | null>(null);

  categories: ExpenseCategoryOption[] = [
    { value: 'ALL', label: 'Todas' },
    { value: 'RENT', label: 'Renta' },
    { value: 'ELECTRICITY', label: 'Luz' },
    { value: 'WATER', label: 'Agua' },
    { value: 'PAYROLL', label: 'Sueldos' },
    { value: 'MAINTENANCE', label: 'Mantenimiento' },
    { value: 'CLEANING', label: 'Limpieza' },
    { value: 'MARKETING', label: 'Marketing' },
    { value: 'STORE_SUPPLIES', label: 'Compras de tienda' },
    { value: 'EQUIPMENT', label: 'Equipo' },
    { value: 'OTHER', label: 'Otros' },
  ];

  form = this.fb.nonNullable.group({
    concept: ['', [Validators.required, Validators.minLength(2)]],
    category: ['OTHER' as ExpenseCategory, [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    date: [this.getTodayInputValue(), [Validators.required]],
    notes: [''],
  });

  totalExpenses = computed(() => {
    return this.expenses().reduce((sum, expense) => {
      return sum + Number(expense.amount || 0);
    }, 0);
  });

  averageExpense = computed(() => {
    const count = this.expenses().length;
    return count > 0 ? this.totalExpenses() / count : 0;
  });

  topCategory = computed(() => {
    const totals = new Map<ExpenseCategory, number>();

    for (const expense of this.expenses()) {
      totals.set(
        expense.category,
        Number(totals.get(expense.category) || 0) + Number(expense.amount || 0),
      );
    }

    const top = Array.from(totals.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? this.getCategoryLabel(top[0]) : 'Sin datos';
  });

  ngOnInit(): void {
    this.loadExpenses();
  }

  loadExpenses(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.expensesService.list({
      period: this.periodFilter(),
      category: this.categoryFilter(),
    }).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loading.set(false);
      },
      error: (error) => {
        console.error(error);
        this.errorMessage.set(this.getApiErrorMessage(error, 'No se pudieron cargar los gastos.'));
        this.loading.set(false);
      }
    });
  }

  changePeriod(period: FinancePeriodFilter): void {
    this.periodFilter.set(period);
    this.loadExpenses();
  }

  changeCategory(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ExpenseCategory | 'ALL';
    this.categoryFilter.set(value);
    this.loadExpenses();
  }

  openCreateForm(): void {
    this.editingExpense.set(null);
    this.form.reset({
      concept: '',
      category: 'OTHER',
      amount: 0,
      date: this.getTodayInputValue(),
      notes: '',
    });
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showForm.set(true);
  }

  openEditForm(expense: Expense): void {
    this.editingExpense.set(expense);
    this.form.reset({
      concept: expense.concept,
      category: expense.category,
      amount: Number(expense.amount || 0),
      date: this.getDateInputValue(expense.date),
      notes: expense.notes || '',
    });
    this.errorMessage.set('');
    this.successMessage.set('');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingExpense.set(null);
  }

  async saveExpense(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Revisa concepto, monto y fecha del gasto.');
      return;
    }

    const value = this.form.getRawValue();
    const payload: ExpensePayload = {
      concept: value.concept.trim(),
      category: value.category,
      amount: Number(value.amount || 0),
      date: value.date,
      notes: value.notes.trim() || null,
    };

    if (!payload.concept) {
      this.errorMessage.set('El concepto es obligatorio.');
      return;
    }

    if (payload.amount <= 0) {
      this.errorMessage.set('El monto debe ser mayor a 0.');
      return;
    }

    this.saving.set(true);

    try {
      const current = this.editingExpense();

      if (current) {
        await firstValueFrom(this.expensesService.update(current.id, payload));
        this.successMessage.set('Gasto actualizado correctamente.');
      } else {
        await firstValueFrom(this.expensesService.create(payload));
        this.successMessage.set('Gasto registrado correctamente.');
      }

      this.closeForm();
      this.loadExpenses();
    } catch (error) {
      console.error(error);
      this.errorMessage.set(this.getApiErrorMessage(error, 'No se pudo guardar el gasto.'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteExpense(expense: Expense): Promise<void> {
    const confirmed = window.confirm(`¿Eliminar el gasto "${expense.concept}"?`);

    if (!confirmed) {
      return;
    }

    const reason = window.prompt('Motivo de cancelación del gasto');

    if (!reason || reason.trim().length < 3) {
      this.errorMessage.set('Captura un motivo de al menos 3 caracteres.');
      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(this.expensesService.delete(expense.id, reason.trim()));
      this.successMessage.set('Gasto cancelado correctamente.');
      this.loadExpenses();
    } catch (error) {
      console.error(error);
      this.errorMessage.set(this.getApiErrorMessage(error, 'No se pudo eliminar el gasto.'));
    }
  }

  getCategoryLabel(category: ExpenseCategory | 'ALL' | string): string {
    return this.categories.find((item) => item.value === category)?.label || 'Otros';
  }

  formatDate(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';

    return new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  private getTodayInputValue(): string {
    return this.getDateInputValue(new Date().toISOString());
  }

  private getDateInputValue(value: string): string {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getApiErrorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }

    return fallback;
  }
}
