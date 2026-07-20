import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExpenseCategory,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

type ExpensePeriod = 'all' | 'this-month' | 'last-30-days' | 'today';

interface ExpenseQuery {
  period?: ExpensePeriod;
  from?: string;
  to?: string;
  category?: ExpenseCategory;
}

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateExpenseDto) {
    const data = this.buildExpenseData(dto) as Prisma.ExpenseUncheckedCreateInput;

    return this.prisma.expense.create({
      data,
    });
  }

  findAll(query: ExpenseQuery = {}) {
    const range = this.getDateRange(query);

    return this.prisma.expense.findMany({
      where: {
        cancelledAt: null,
        date: this.getDateWhere(range),
        category: query.category || undefined,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    if (!expense) {
      throw new NotFoundException('Gasto no encontrado');
    }

    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto) {
    await this.findOne(id);
    const data = this.buildExpenseData(dto, true) as Prisma.ExpenseUncheckedUpdateInput;

    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.findOne(id);
    const reason = normalizeAuditReason(
      input.reason,
      'Cancelación de gasto desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.expense.update({
        where: { id },
        data: {
          cancelledAt: new Date(),
          cancellationReason: reason,
          cancelledById: input.actorId || null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'EXPENSE_CANCEL',
          entityType: 'Expense',
          entityId: id,
          actorId: input.actorId || null,
          reason,
          before: toAuditJson(current),
          after: toAuditJson(cancelled),
        },
      });

      return {
        success: true,
        deleted: cancelled,
        cancelled,
      };
    });
  }

  private buildExpenseData(
    dto: CreateExpenseDto | UpdateExpenseDto,
    partial = false,
  ): Prisma.ExpenseUncheckedCreateInput | Prisma.ExpenseUncheckedUpdateInput {
    const data: Prisma.ExpenseUncheckedCreateInput | Prisma.ExpenseUncheckedUpdateInput = {};

    if ('concept' in dto && dto.concept !== undefined) {
      const concept = String(dto.concept || '').trim();

      if (concept.length < 2) {
        throw new BadRequestException('El concepto debe tener al menos 2 caracteres.');
      }

      data.concept = concept;
    }

    if ('amount' in dto && dto.amount !== undefined) {
      const amount = Number(dto.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('El monto debe ser mayor a 0.');
      }

      data.amount = amount;
    }

    if ('date' in dto && dto.date !== undefined) {
      const date = this.parseLocalDate(dto.date);

      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException('La fecha del gasto no es válida.');
      }

      data.date = date;
    }

    if ('category' in dto && dto.category !== undefined) {
      data.category = dto.category || ExpenseCategory.OTHER;
    }

    if ('notes' in dto && dto.notes !== undefined) {
      const notes = String(dto.notes || '').trim();
      data.notes = notes || null;
    }

    if (!partial) {
      data.category = data.category || ExpenseCategory.OTHER;
    }

    return data;
  }

  private getDateRange(query: ExpenseQuery) {
    if (query.from || query.to) {
      return {
        from: query.from ? this.parseLocalDate(query.from) : null,
        to: query.to ? this.getEndOfDay(this.parseLocalDate(query.to)) : null,
      };
    }

    const period = query.period || 'all';
    const now = new Date();

    if (period === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);

      return {
        from,
        to: this.getEndOfDay(from),
      };
    }

    if (period === 'this-month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        from,
        to: this.getEndOfDay(to),
      };
    }

    if (period === 'last-30-days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);

      return {
        from,
        to: this.getEndOfDay(now),
      };
    }

    return {
      from: null,
      to: null,
    };
  }

  private getDateWhere(range: {
    from: Date | null;
    to: Date | null;
  }): Prisma.DateTimeFilter | undefined {
    if (!range.from && !range.to) {
      return undefined;
    }

    return {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {}),
    };
  }

  private parseLocalDate(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00`);
  }

  private getEndOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}
