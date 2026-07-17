import { Injectable } from '@nestjs/common';
import {
  AttendanceStatus,
  ExpenseCategory,
  PaymentConcept,
  PosSaleItemType,
  PosSaleStatus,
  Prisma,
  ReservationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateHours } from '../utils/recurrence.util';

type FinancePeriod = 'today' | 'this-month' | 'last-30-days' | 'all';

export interface FinanceSummaryQuery {
  period?: FinancePeriod;
  from?: string;
  to?: string;
}

export interface ProductDistributionItem {
  productName: string;
  area: string;
  salesCount: number;
  credits: number;
  income: number;
  percentage: number;
}

@Injectable()
export class FinancesService {
  constructor(private prisma: PrismaService) {}

  async getSummary(query: FinanceSummaryQuery = {}) {
    const range = this.getDateRange(query);
    const membershipCreatedAt = this.getCreatedAtWhere(range);
    const saleCreatedAt = this.getCreatedAtWhere(range);

    const [
      memberships,
      academicChargeItems,
      directAcademicChargePayments,
      storeItems,
      expenses,
      attendances,
      attendedReservations,
      posSales,
    ] = await Promise.all([
      this.prisma.membership.findMany({
        where: {
          createdAt: membershipCreatedAt,
          OR: [
            {
              posSaleItems: {
                none: {},
              },
            },
            {
              posSaleItems: {
                some: {
                  sale: {
                    status: PosSaleStatus.COMPLETED,
                  },
                },
              },
            },
          ],
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          student: true,
          package: true,
          posSaleItems: {
            where: {
              type: PosSaleItemType.ACADEMIC,
              sale: {
                status: PosSaleStatus.COMPLETED,
              },
            },
            include: {
              sale: true,
              payment: true,
            },
          },
        },
      }),
      this.prisma.posSaleItem.findMany({
        where: {
          type: {
            in: [PosSaleItemType.INSCRIPTION, PosSaleItemType.RENEWAL],
          },
          sale: {
            createdAt: saleCreatedAt,
            status: PosSaleStatus.COMPLETED,
          },
        },
        include: {
          sale: {
            include: {
              student: true,
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          concept: {
            in: [PaymentConcept.INSCRIPCION, PaymentConcept.RENEWAL],
          },
          createdAt: this.getCreatedAtWhere(range),
          posSaleItems: {
            none: {},
          },
        },
        include: {
          student: true,
        },
      }),
      this.prisma.posSaleItem.findMany({
        where: {
          type: PosSaleItemType.STORE,
          sale: {
            createdAt: saleCreatedAt,
            status: PosSaleStatus.COMPLETED,
          },
        },
        include: {
          sale: true,
          product: true,
        },
      }),
      this.prisma.expense.findMany({
        where: {
          date: this.getCreatedAtWhere(range),
        },
        orderBy: {
          date: 'desc',
        },
      }),
      this.prisma.attendance.findMany({
        where: {
          status: AttendanceStatus.PRESENT,
          createdAt: this.getCreatedAtWhere(range),
        },
        include: {
          student: {
            include: {
              memberships: {
                include: {
                  package: true,
                },
                orderBy: {
                  createdAt: 'desc',
                },
              },
            },
          },
          session: {
            include: {
              class: {
                include: {
                  teacher: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          status: ReservationStatus.ATTENDED,
          createdAt: this.getCreatedAtWhere(range),
        },
        include: {
          student: true,
          session: {
            include: {
              class: {
                include: {
                  teacher: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.posSale.findMany({
        where: {
          createdAt: saleCreatedAt,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          student: true,
          items: {
            orderBy: {
              createdAt: 'asc',
            },
            include: {
              payment: true,
              package: true,
              product: true,
              membership: {
                include: {
                  package: true,
                  transactions: true,
                },
              },
              storeSale: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const academicSales = memberships.map((membership) => {
      const linkedItem = membership.posSaleItems[0];
      const amount = linkedItem
        ? Number(linkedItem.total || 0)
        : Number(membership.package?.price || 0);

      return {
        date: (linkedItem?.sale?.createdAt || membership.createdAt).toISOString(),
        studentName: membership.student?.name || 'Sin alumno',
        productName: membership.package?.name || linkedItem?.name || 'Sin paquete',
        area: membership.package?.area || 'DANCE',
        amount,
        credits: Number(membership.initialCredits || 0),
        availableCredits: Number(membership.availableCredits || 0),
        expirationDate: membership.expirationDate?.toISOString() || null,
        status: membership.status,
      };
    });

    const academicChargeSales = [
      ...academicChargeItems.map((item) => ({
        date: (item.sale?.createdAt || item.createdAt).toISOString(),
        studentName: item.sale?.student?.name || 'Sin alumno',
        productName: item.type === PosSaleItemType.RENEWAL
          ? 'Renovación'
          : 'Inscripción',
        area: 'CONCEPTO',
        amount: Number(item.total || 0),
        credits: 0,
        availableCredits: 0,
        expirationDate: null,
        status: 'PAID',
      })),
      ...directAcademicChargePayments.map((payment) => ({
        date: payment.createdAt.toISOString(),
        studentName: payment.student?.name || 'Sin alumno',
        productName: payment.concept === PaymentConcept.RENEWAL
          ? 'Renovación'
          : 'Inscripción',
        area: 'CONCEPTO',
        amount: Number(payment.amount || 0),
        credits: 0,
        availableCredits: 0,
        expirationDate: null,
        status: 'PAID',
      })),
    ];

    const academicAndRenewalSales = [
      ...academicSales,
      ...academicChargeSales,
    ];

    const academicIncome = this.roundMoney(
      academicAndRenewalSales.reduce((sum, sale) => sum + sale.amount, 0),
    );
    const storeIncome = this.roundMoney(
      storeItems.reduce((sum, item) => sum + Number(item.total || 0), 0),
    );
    const grossIncome = this.roundMoney(academicIncome + storeIncome);
    const income = academicIncome;
    const expensesTotal = this.roundMoney(
      expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    );
    const teacherPaymentRows = await this.getTeacherPaymentRows(
      attendances,
      attendedReservations,
    );
    const teacherPayments = this.roundMoney(
      teacherPaymentRows.reduce((sum, item) => {
        return sum + Number(item.teacherPayment || 0);
      }, 0),
    );
    const utilityBeforeTeachers = this.roundMoney(income - expensesTotal);
    const finalUtility = this.roundMoney(
      income - expensesTotal - teacherPayments,
    );
    const generalUtilityBeforeTeachers = this.roundMoney(grossIncome - expensesTotal);
    const generalFinalUtility = this.roundMoney(
      grossIncome - expensesTotal - teacherPayments,
    );
    const academicSalesCount = academicAndRenewalSales.length;
    const creditsSold = academicAndRenewalSales.reduce((sum, sale) => {
      return sum + Number(sale.credits || 0);
    }, 0);
    const averageAcademicSale = academicSalesCount > 0
      ? this.roundMoney(academicIncome / academicSalesCount)
      : 0;
    const margin = income > 0
      ? this.roundPercent((finalUtility / income) * 100)
      : 0;
    const productDistribution = this.getProductDistribution(
      academicAndRenewalSales,
      academicIncome,
    );
    const expenseDistribution = this.getExpenseDistribution(expenses, expensesTotal);

    return {
      period: {
        key: range.key,
        from: range.from?.toISOString() || null,
        to: range.to?.toISOString() || null,
      },
      totals: {
        income,
        grossIncome,
        academicIncome,
        storeIncome,
        expenses: expensesTotal,
        teacherPayments,
        utilityBeforeTeachers,
        finalUtility,
        academicUtilityBeforeTeachers: utilityBeforeTeachers,
        academicFinalUtility: finalUtility,
        generalUtilityBeforeTeachers,
        generalFinalUtility,
        generalMargin: grossIncome > 0
          ? this.roundPercent((generalFinalUtility / grossIncome) * 100)
          : 0,
        margin,
        academicSalesCount,
        creditsSold,
        averageAcademicSale,
        attendancesCount: teacherPaymentRows.length,
        storeSalesCount: storeItems.length,
      },
      productDistribution,
      expenseDistribution,
      latestAcademicSales: academicAndRenewalSales
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20),
      expenses: expenses.map((expense) => ({
        id: expense.id,
        date: expense.date.toISOString(),
        label: expense.concept,
        concept: expense.concept,
        category: expense.category,
        categoryLabel: this.getExpenseCategoryLabel(expense.category),
        amount: Number(expense.amount || 0),
        notes: expense.notes,
        createdAt: expense.createdAt.toISOString(),
      })),
      sales: posSales,
      chartData: {
        incomeVsExpenses: [
          { label: 'Académico', value: academicIncome },
          { label: 'Tienda', value: storeIncome },
          { label: 'Gastos', value: expensesTotal },
          { label: 'Docencia', value: teacherPayments },
          { label: 'Utilidad general', value: generalFinalUtility },
        ],
      },
    };
  }

  private getProductDistribution(
    sales: Array<{
      productName: string;
      area: string;
      amount: number;
      credits: number;
    }>,
    academicIncome: number,
  ): ProductDistributionItem[] {
    const map = new Map<string, ProductDistributionItem>();

    for (const sale of sales) {
      const key = `${sale.productName}|${sale.area}`;
      const current = map.get(key) || {
        productName: sale.productName,
        area: sale.area,
        salesCount: 0,
        credits: 0,
        income: 0,
        percentage: 0,
      };

      current.salesCount += 1;
      current.credits += Number(sale.credits || 0);
      current.income = this.roundMoney(current.income + Number(sale.amount || 0));

      map.set(key, current);
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: academicIncome > 0
          ? this.roundPercent((item.income / academicIncome) * 100)
          : 0,
      }))
      .sort((a, b) => b.income - a.income);
  }

  private getExpenseDistribution(
    expenses: Array<{
      category: ExpenseCategory;
      amount: number;
    }>,
    totalExpenses: number,
  ) {
    const map = new Map<ExpenseCategory, {
      category: ExpenseCategory;
      categoryLabel: string;
      amount: number;
      percentage: number;
    }>();

    for (const expense of expenses) {
      const category = expense.category || ExpenseCategory.OTHER;
      const current = map.get(category) || {
        category,
        categoryLabel: this.getExpenseCategoryLabel(category),
        amount: 0,
        percentage: 0,
      };

      current.amount = this.roundMoney(current.amount + Number(expense.amount || 0));
      map.set(category, current);
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        percentage: totalExpenses > 0
          ? this.roundPercent((item.amount / totalExpenses) * 100)
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private async getTeacherPaymentRows(attendances: any[], reservations: any[]) {
    const byStudentClass = new Map<string, {
      studentId: string;
      studentName: string;
      sessionId: string;
      classHours: number;
      membershipId: string | null;
    }>();

    for (const attendance of attendances) {
      if (!attendance.sessionId) {
        continue;
      }

      const attendedReservation = reservations.find((reservation: any) => {
        return reservation.studentId === attendance.studentId &&
          reservation.sessionId === attendance.sessionId;
      });
      const key = this.getSessionFinanceKey(attendance.sessionId, attendance.studentId);

      byStudentClass.set(key, {
        studentId: attendance.studentId,
        studentName: attendance.student?.name || 'Alumno',
        sessionId: attendance.sessionId,
        classHours: this.calculateClassHours(attendance.session),
        membershipId: attendedReservation?.creditMembershipId || null,
      });
    }

    for (const reservation of reservations) {
      if (!reservation.sessionId) {
        continue;
      }

      const key = this.getSessionFinanceKey(reservation.sessionId, reservation.studentId);

      if (byStudentClass.has(key)) {
        continue;
      }

      byStudentClass.set(key, {
        studentId: reservation.studentId,
        studentName: reservation.student?.name || 'Alumno',
        sessionId: reservation.sessionId,
        classHours: this.calculateClassHours(reservation.session),
        membershipId: reservation.creditMembershipId || null,
      });
    }

    const membershipIds = Array.from(
      new Set(
        Array.from(byStudentClass.values())
          .map((item) => item.membershipId)
          .filter(Boolean) as string[],
      ),
    );

    const memberships = membershipIds.length
      ? await this.prisma.membership.findMany({
          where: {
            id: {
              in: membershipIds,
            },
          },
          include: {
            package: true,
          },
        })
      : [];

    const membershipMap = new Map(
      memberships.map((membership) => [membership.id, membership]),
    );

    return Array.from(byStudentClass.values()).map((item) => {
      const membership = item.membershipId
        ? membershipMap.get(item.membershipId)
        : null;
      const packageData = membership?.package || null;

      return {
        ...item,
        packageName: packageData?.name || 'Sin paquete identificado',
        teacherPayment: packageData
          ? this.calculateTeacherPayment(packageData)
          : 0,
      };
    });
  }

  private calculateClassHours(selectedClass: {
    startTime?: string | null;
    endTime?: string | null;
    durationMinutes?: number | null;
  } | null | undefined): number {
    const recurrenceHours = calculateHours(
      selectedClass?.startTime,
      selectedClass?.endTime,
    );

    if (recurrenceHours > 0) {
      return recurrenceHours;
    }

    return Number(selectedClass?.durationMinutes || 0) / 60;
  }

  private getSessionFinanceKey(sessionId: string, studentId: string) {
    return `SESSION:${sessionId}:${studentId}`;
  }

  private calculateTeacherPayment(packageData: {
    price?: number | null;
    teacherPercentage?: number | null;
    teacherPaymentPerClass?: number | null;
    credits?: number | null;
  }) {
    const storedPayment = Number(packageData.teacherPaymentPerClass || 0);

    if (storedPayment > 0) {
      return this.roundMoney(storedPayment);
    }

    const credits = Number(packageData.credits || 0);

    if (credits <= 0) {
      return 0;
    }

    return this.roundMoney(
      (Number(packageData.price || 0) *
        Number(packageData.teacherPercentage || 0)) /
        100 /
        credits,
    );
  }

  private getExpenseCategoryLabel(category?: ExpenseCategory | null): string {
    const labels: Record<ExpenseCategory, string> = {
      RENT: 'Renta',
      ELECTRICITY: 'Luz',
      WATER: 'Agua',
      PAYROLL: 'Sueldos',
      MAINTENANCE: 'Mantenimiento',
      CLEANING: 'Limpieza',
      MARKETING: 'Marketing',
      STORE_SUPPLIES: 'Compras de tienda',
      EQUIPMENT: 'Equipo',
      OTHER: 'Otros',
    };

    return labels[category || ExpenseCategory.OTHER];
  }

  private getDateRange(query: FinanceSummaryQuery) {
    if (query.from || query.to) {
      return {
        key: 'custom',
        from: query.from ? new Date(`${query.from}T00:00:00`) : null,
        to: query.to ? this.getEndOfDay(new Date(`${query.to}T00:00:00`)) : null,
      };
    }

    const period = query.period || 'all';
    const now = new Date();

    if (period === 'today') {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);

      return {
        key: period,
        from,
        to: this.getEndOfDay(from),
      };
    }

    if (period === 'this-month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      return {
        key: period,
        from,
        to: this.getEndOfDay(to),
      };
    }

    if (period === 'last-30-days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);

      return {
        key: period,
        from,
        to: this.getEndOfDay(now),
      };
    }

    return {
      key: 'all',
      from: null,
      to: null,
    };
  }

  private getCreatedAtWhere(range: {
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

  private getEndOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private roundMoney(value: number) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  private roundPercent(value: number) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 10) / 10;
  }
}
