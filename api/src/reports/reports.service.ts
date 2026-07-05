import { Injectable } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getUtilities() {
    const payments = await this.prisma.payment.findMany({
      include: { student: true },
    });

    const expenses = await this.prisma.expense.findMany();

    const memberships = await this.prisma.membership.findMany({
      include: {
        package: true,
        student: true,
      },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { status: AttendanceStatus.PRESENT },
      include: {
        student: {
          include: {
            memberships: {
              include: { package: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        class: {
          include: {
            teacher: true,
            room: true,
          },
        },
      },
    });

    const rentals = await this.prisma.class.findMany({
      where: { type: 'RENTAL' },
      include: { room: true },
    });

    const cashIncomeFromPayments = payments.reduce((sum, payment) => {
      return sum + Number(payment.amount || 0);
    }, 0);

    const rentalIncome = rentals.reduce((sum, rental) => {
      return sum + Number(rental.teacherPaymentAmount || 0);
    }, 0);

    const cashIncome =
      cashIncomeFromPayments + rentalIncome;

    const totalExpenses = expenses.reduce((sum, expense) => {
      return sum + Number(expense.amount || 0);
    }, 0);

    const teacherPayments = attendances.reduce((sum, attendance) => {
      const membership = attendance.student.memberships[0];
      return sum + Number(membership?.package?.teacherPaymentPerClass || 0);
    }, 0);

    const recognizedMembershipIncome = memberships.reduce((sum, membership) => {
      const consumedCredits =
        Number(membership.initialCredits || 0) -
        Number(membership.availableCredits || 0);

      const pricePerCredit =
        Number(membership.initialCredits || 0) > 0
          ? Number(membership.package.price || 0) / Number(membership.initialCredits || 0)
          : 0;

      return sum + consumedCredits * pricePerCredit;
    }, 0);

    const deferredMembershipIncome = memberships.reduce((sum, membership) => {
      const pricePerCredit =
        Number(membership.initialCredits || 0) > 0
          ? Number(membership.package.price || 0) / Number(membership.initialCredits || 0)
          : 0;

      return sum + Number(membership.availableCredits || 0) * pricePerCredit;
    }, 0);

    const recognizedIncome =
      recognizedMembershipIncome + rentalIncome;

    const withdrawableProfit =
      recognizedIncome - totalExpenses - teacherPayments;

    const paymentBreakdown = [
      {
        label: 'Dinero recibido por pagos',
        amount: cashIncomeFromPayments,
      },
      {
        label: 'Rentas de espacios',
        amount: rentalIncome,
      },
      {
        label: 'Ingreso reconocido por créditos consumidos',
        amount: recognizedMembershipIncome,
      },
      {
        label: 'Ingreso pendiente por consumir',
        amount: deferredMembershipIncome,
      },
    ];

    const expenseBreakdown = expenses.map((expense) => ({
      label: expense.concept,
      amount: Number(expense.amount || 0),
      notes: expense.notes,
      createdAt: expense.createdAt,
    }));

    const teacherBreakdownMap = new Map<string, {
      teacherName: string;
      attendances: number;
      amount: number;
    }>();

    for (const attendance of attendances) {
      const teacherId = attendance.class.teacher?.id || 'sin-docente';
      const teacherName = attendance.class.teacher?.name || 'Sin docente';

      const membership = attendance.student.memberships[0];
      const paymentPerClass =
        Number(membership?.package?.teacherPaymentPerClass || 0);

      const current = teacherBreakdownMap.get(teacherId) || {
        teacherName,
        attendances: 0,
        amount: 0,
      };

      current.attendances += 1;
      current.amount += paymentPerClass;

      teacherBreakdownMap.set(teacherId, current);
    }

    return {
      cashIncome,
      cashIncomeFromPayments,
      rentalIncome,

      recognizedIncome,
      recognizedMembershipIncome,
      deferredMembershipIncome,

      totalExpenses,
      teacherPayments,
      withdrawableProfit,

      attendancesCount: attendances.length,
      rentalsCount: rentals.length,

      paymentBreakdown,
      expenseBreakdown,
      teacherBreakdown: Array.from(teacherBreakdownMap.values()),

      legacy: {
        totalIncome: cashIncome,
        finalUtility: withdrawableProfit,
      },
    };
  }
}
