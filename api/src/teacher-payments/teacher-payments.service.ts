import { Injectable } from '@nestjs/common';
import { AcademicArea, PosSaleItemType, PosSaleStatus } from '@prisma/client';
import { AttendancesService } from '../attendances/attendances.service';
import { PrismaService } from '../prisma/prisma.service';

type PeriodKey = 'all' | 'this-month' | 'last-30-days' | 'today' | 'custom';

export interface TeacherPaymentQuery {
  period?: PeriodKey;
  from?: string;
  to?: string;
  teacherId?: string;
  area?: AcademicArea | 'ALL';
}

export interface TeacherPaymentItem {
  id: string;
  date: string;
  teacherId: string | null;
  teacherName: string;
  sessionId: string;
  className: string;
  area: string;
  studentId: string | null;
  studentName: string;
  packageName: string;
  packageArea: string | null;
  teacherPayment: number;
  source: 'RESERVATION' | 'ATTENDANCE' | 'DIRECT_ENROLLMENT';
}

@Injectable()
export class TeacherPaymentsService {
  constructor(
    private attendancesService: AttendancesService,
    private prisma: PrismaService,
  ) {}

  async getSummary(query: TeacherPaymentQuery = {}) {
    const period = this.getPeriod(query);
    const teacherId =
      query.teacherId && query.teacherId !== 'ALL' ? query.teacherId : undefined;
    const area =
      query.area && query.area !== 'ALL' ? query.area : undefined;
    const rows = await this.attendancesService.getNormalizedAttendances({
      period: query.period || 'all',
      from: query.from,
      to: query.to,
      teacherId,
      area,
      status: 'ATTENDED',
    });

    const attendanceItems = rows
      .filter((item) => {
        return (
          item.classType !== 'RENTAL' &&
          (item.status === 'ATTENDED' || item.status === 'PRESENT') &&
          (!teacherId || item.teacherId === teacherId) &&
          (!area || item.area === area)
        );
      })
      .map((item) => this.normalizeItem(item));
    const directEnrollmentItems = await this.getDirectEnrollmentItems({
      period: query.period || 'all',
      from: query.from,
      to: query.to,
      teacherId,
      area,
    });
    const items = [...attendanceItems, ...directEnrollmentItems];

    const sessionIds = new Set(items.map((item) => item.sessionId).filter(Boolean));
    const teacherIds = new Set(items.map((item) => item.teacherId).filter(Boolean));
    const teacherPaymentTotal = this.roundMoney(
      items.reduce((sum, item) => sum + Number(item.teacherPayment || 0), 0),
    );

    return {
      period,
      totals: {
        teacherPaymentTotal,
        teachersCount: teacherIds.size,
        sessionsCount: sessionIds.size,
        classesCount: sessionIds.size,
        payableAttendancesCount: items.length,
        averagePerSession: this.roundMoney(
          sessionIds.size ? teacherPaymentTotal / sessionIds.size : 0,
        ),
        averagePerClass: this.roundMoney(
          sessionIds.size ? teacherPaymentTotal / sessionIds.size : 0,
        ),
      },
      teachers: this.getTeacherRows(items),
      items,
    };
  }

  private normalizeItem(item: any): TeacherPaymentItem {
    return {
      id: `${item.source}-${item.id}`,
      date: item.date,
      teacherId: item.teacherId || null,
      teacherName: item.teacherName || 'Sin docente',
      sessionId: item.sessionId,
      className: item.className || 'Clase',
      area: item.area || 'DANCE',
      studentId: item.studentId || null,
      studentName: item.studentName || 'Sin alumno',
      packageName: item.packageName || 'Sin paquete identificado',
      packageArea: item.packageArea || null,
      teacherPayment: this.roundMoney(item.teacherPayment || 0),
      source: item.source,
    };
  }

  private async getDirectEnrollmentItems(query: {
    period: PeriodKey;
    from?: string;
    to?: string;
    teacherId?: string;
    area?: AcademicArea;
  }): Promise<TeacherPaymentItem[]> {
    const range = this.getDateRange(query);
    const saleItems = await this.prisma.posSaleItem.findMany({
      where: {
        type: PosSaleItemType.COURSE_EVENT,
        courseEventId: {
          not: null,
        },
        createdAt: {
          gte: range.from || undefined,
          lte: range.to || undefined,
        },
        sale: {
          status: PosSaleStatus.COMPLETED,
        },
      },
      include: {
        payment: {
          include: {
            student: true,
          },
        },
        sale: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const classIds = Array.from(
      new Set(
        saleItems
          .map((item) => item.courseEventId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (classIds.length === 0) {
      return [];
    }

    const classes = await this.prisma.class.findMany({
      where: {
        id: {
          in: classIds,
        },
        type: {
          in: ['COURSE', 'WORKSHOP', 'EVENT'],
        },
        directEnrollmentCost: {
          not: null,
        },
        teacherDirectPercentage: {
          not: null,
        },
        teacherId: query.teacherId || undefined,
        area: query.area || undefined,
      },
      include: {
        teacher: true,
      },
    });
    const classById = new Map(classes.map((item) => [item.id, item]));

    return saleItems.reduce<TeacherPaymentItem[]>((items, item) => {
        const activity = item.courseEventId ? classById.get(item.courseEventId) : null;

        if (!activity) {
          return items;
        }

        const student = item.payment?.student || item.sale?.student || null;
        const percentage = Number(
          item.teacherCommissionPercentage ?? activity.teacherDirectPercentage ?? 0,
        );
        const teacherPayment = this.roundMoney(
          item.teacherCommissionAmount !== null && item.teacherCommissionAmount !== undefined
            ? Number(item.teacherCommissionAmount || 0)
            : Number(item.total || 0) * percentage / 100,
        );

        items.push({
          id: `DIRECT_ENROLLMENT-${item.id}`,
          date: item.createdAt.toISOString(),
          teacherId: activity.teacherId || null,
          teacherName: activity.teacher?.name || 'Sin docente',
          sessionId: `DIRECT:${item.id}`,
          className: activity.title || 'Actividad temporal',
          area: activity.area || 'DANCE',
          studentId: student?.id || null,
          studentName: student?.name || 'Sin alumno',
          packageName: `Venta directa de curso/taller/evento · ${this.formatMoney(Number(item.total || 0))} · Comisión ${percentage}%`,
          packageArea: null,
          teacherPayment,
          source: 'DIRECT_ENROLLMENT' as const,
        });

        return items;
      }, []);
  }

  private getTeacherRows(items: TeacherPaymentItem[]) {
    const map = new Map<
      string,
      {
        teacherId: string | null;
        teacherName: string;
        sessionIds: Set<string>;
        payableAttendancesCount: number;
        teacherPaymentTotal: number;
      }
    >();

    for (const item of items) {
      const key = item.teacherId || 'NO_TEACHER';
      const row = map.get(key) || {
        teacherId: item.teacherId,
        teacherName: item.teacherName,
        sessionIds: new Set<string>(),
        payableAttendancesCount: 0,
        teacherPaymentTotal: 0,
      };

      if (item.sessionId) {
        row.sessionIds.add(item.sessionId);
      }

      row.payableAttendancesCount += 1;
      row.teacherPaymentTotal += Number(item.teacherPayment || 0);
      map.set(key, row);
    }

    return Array.from(map.values())
      .map((row) => {
        const teacherPaymentTotal = this.roundMoney(row.teacherPaymentTotal);
        const sessionsCount = row.sessionIds.size;

        return {
          teacherId: row.teacherId,
          teacherName: row.teacherName,
          sessionsCount,
          classesCount: sessionsCount,
          payableAttendancesCount: row.payableAttendancesCount,
          teacherPaymentTotal,
          averagePerSession: this.roundMoney(
            sessionsCount ? teacherPaymentTotal / sessionsCount : 0,
          ),
          averagePerClass: this.roundMoney(
            sessionsCount ? teacherPaymentTotal / sessionsCount : 0,
          ),
        };
      })
      .sort((a, b) => b.teacherPaymentTotal - a.teacherPaymentTotal);
  }

  private getPeriod(query: TeacherPaymentQuery) {
    const range = this.getDateRange(query);

    return {
      key: query.from || query.to ? 'custom' : query.period || 'all',
      from: range.from ? range.from.toISOString() : null,
      to: range.to ? range.to.toISOString() : null,
    };
  }

  private getDateRange(query: TeacherPaymentQuery) {
    if (query.from || query.to) {
      return {
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

  private getEndOfDay(date: Date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private roundMoney(value: number) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  private formatMoney(value: number) {
    return this.roundMoney(value).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }
}
