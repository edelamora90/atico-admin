import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AcademicArea,
  ClassSessionCancellationType,
  PosSaleItemType,
  PosSaleStatus,
  Prisma,
  ReservationStatus,
  AttendanceStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTeacherPaymentSettingsDto } from './dto/update-teacher-payment-settings.dto';

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
  attendeesCount: number;
  observation: string;
  cancellationType: ClassSessionCancellationType | null;
  cancellationReason: string | null;
  source: 'CLASS_SESSION' | 'DIRECT_ENROLLMENT';
}

export interface TeacherPaymentSettingsResponse {
  id: string;
  minimumClassAmount: number;
  cancellationWithPaymentAmount: number | null;
  isActive: boolean;
  ranges: Array<{
    id?: string;
    minStudents: number;
    maxStudents: number | null;
    amount: number;
    sortOrder: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ActiveTeacherPaymentSettings {
  id: string;
  minimumClassAmount: Prisma.Decimal | number;
  cancellationWithPaymentAmount: Prisma.Decimal | number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ranges: Array<{
    id: string;
    minStudents: number;
    maxStudents: number | null;
    amount: Prisma.Decimal | number;
    sortOrder: number;
  }>;
}

@Injectable()
export class TeacherPaymentsService {
  constructor(private prisma: PrismaService) {}

  private readonly defaultRanges = [
    { minStudents: 0, maxStudents: 1, amount: 50 },
    { minStudents: 2, maxStudents: 3, amount: 80 },
    { minStudents: 4, maxStudents: 4, amount: 100 },
    { minStudents: 5, maxStudents: 5, amount: 120 },
    { minStudents: 6, maxStudents: 6, amount: 140 },
    { minStudents: 7, maxStudents: 7, amount: 160 },
    { minStudents: 8, maxStudents: 8, amount: 180 },
    { minStudents: 9, maxStudents: null, amount: 200 },
  ];

  async getSettings(): Promise<TeacherPaymentSettingsResponse> {
    return this.mapSettingsResponse(await this.getActiveSettings());
  }

  async updateSettings(dto: UpdateTeacherPaymentSettingsDto): Promise<TeacherPaymentSettingsResponse> {
    const ranges = this.validateAndNormalizeRanges(dto.ranges || []);
    const minimumClassAmount = this.roundMoney(Number(dto.minimumClassAmount || 0));
    const cancellationWithPaymentAmount =
      dto.cancellationWithPaymentAmount === null ||
      dto.cancellationWithPaymentAmount === undefined ||
      String(dto.cancellationWithPaymentAmount) === ''
        ? null
        : this.roundMoney(Number(dto.cancellationWithPaymentAmount || 0));

    if (minimumClassAmount < 0) {
      throw new BadRequestException('El monto mínimo debe ser mayor o igual a 0.');
    }

    const current = await this.getActiveSettings();

    await this.prisma.$transaction(async (tx) => {
      await tx.teacherPaymentSetting.updateMany({
        where: {
          isActive: true,
          id: {
            not: current.id,
          },
        },
        data: {
          isActive: false,
        },
      });

      await tx.teacherPaymentRange.deleteMany({
        where: {
          settingId: current.id,
        },
      });

      await tx.teacherPaymentSetting.update({
        where: {
          id: current.id,
        },
        data: {
          minimumClassAmount,
          cancellationWithPaymentAmount,
          isActive: true,
          ranges: {
            create: ranges.map((range, index) => ({
              minStudents: range.minStudents,
              maxStudents: range.maxStudents,
              amount: range.amount,
              sortOrder: index,
            })),
          },
        },
      });
    });

    return this.getSettings();
  }

  async getClassTeacherPaymentAmount(attendeesCount: number): Promise<number> {
    const settings = await this.getActiveSettings();
    return this.getClassTeacherPaymentAmountFromSettings(settings, attendeesCount);
  }

  async getClassCancellationWithPaymentAmount(): Promise<number> {
    const settings = await this.getActiveSettings();
    return this.getCancellationWithPaymentAmount(settings);
  }

  async getClassSessionTeacherPaymentAmount(session: {
    status: string;
    cancellationType?: ClassSessionCancellationType | null;
  }, attendeesCount: number): Promise<number> {
    const settings = await this.getActiveSettings();
    return this.getSessionTeacherPayment(session, attendeesCount, settings);
  }

  async getSummary(query: TeacherPaymentQuery = {}) {
    const period = this.getPeriod(query);
    const teacherId =
      query.teacherId && query.teacherId !== 'ALL' ? query.teacherId : undefined;
    const area =
      query.area && query.area !== 'ALL' ? query.area : undefined;
    const classSessionItems = await this.getClassSessionItems({
      period: query.period || 'all',
      from: query.from,
      to: query.to,
      teacherId,
      area,
    });
    const directEnrollmentItems = await this.getDirectEnrollmentItems({
      period: query.period || 'all',
      from: query.from,
      to: query.to,
      teacherId,
      area,
    });
    const items = [...classSessionItems, ...directEnrollmentItems];

    const sessionIds = new Set(items.map((item) => item.sessionId).filter(Boolean));
    const teacherIds = new Set(items.map((item) => item.teacherId).filter(Boolean));
    const attendeesCount = items.reduce((sum, item) => {
      return sum + Number(item.attendeesCount || 0);
    }, 0);
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
        payableAttendancesCount: attendeesCount,
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

  private async getClassSessionItems(query: {
    period: PeriodKey;
    from?: string;
    to?: string;
    teacherId?: string;
    area?: AcademicArea;
  }): Promise<TeacherPaymentItem[]> {
    const range = this.getDateRange(query);
    const date = this.getDateWhere(range);
    const now = new Date();
    const sessions = await this.prisma.classSession.findMany({
      where: {
        ...(date ? { date } : {}),
        class: {
          type: 'CLASS',
          teacherId: query.teacherId || undefined,
          area: query.area || undefined,
        },
      },
      include: {
        class: {
          include: {
            teacher: true,
            room: true,
          },
        },
        reservations: {
          where: {
            status: ReservationStatus.ATTENDED,
            deletedAt: null,
          },
          include: {
            student: true,
          },
        },
        attendances: {
          where: {
            status: AttendanceStatus.PRESENT,
            deletedAt: null,
          },
          include: {
            student: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' },
      ],
    });

    const paymentSettings = await this.getActiveSettings();

    return sessions.reduce<TeacherPaymentItem[]>((items, session) => {
      const isCancelled = session.status === 'CANCELLED';

      if (!isCancelled && !this.hasSessionEnded(session.date, session.endTime, now)) {
        return items;
      }

      const attendeesCount = this.getUniqueAttendeesCount(session);
      const teacherPayment = this.getSessionTeacherPayment(session, attendeesCount, paymentSettings);
      const observation = this.getSessionPaymentObservation(session, attendeesCount, paymentSettings);

      items.push({
        id: `CLASS_SESSION-${session.id}`,
        date: session.date.toISOString(),
        teacherId: session.class.teacherId || null,
        teacherName: session.class.teacher?.name || 'Sin docente',
        sessionId: session.id,
        className: session.class.title || 'Clase',
        area: session.class.area || 'DANCE',
        studentId: null,
        studentName: attendeesCount === 1 ? '1 alumno' : `${attendeesCount} alumnos`,
        packageName: observation,
        packageArea: null,
        teacherPayment,
        attendeesCount,
        observation,
        cancellationType: session.cancellationType || null,
        cancellationReason: session.cancellationReason || null,
        source: 'CLASS_SESSION',
      });

      return items;
    }, []);
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
    const activityIds = Array.from(
      new Set(
        saleItems
          .map((item) => item.courseEventId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (activityIds.length === 0) {
      return [];
    }

    const classes = await this.prisma.class.findMany({
      where: {
        id: {
          in: activityIds,
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
          attendeesCount: Number(item.ticketQuantity || item.quantity || 1),
          observation: `Venta directa de curso/taller/evento · Comisión ${percentage}%`,
          cancellationType: null,
          cancellationReason: null,
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

      row.payableAttendancesCount += Number(item.attendeesCount || 0);
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

  private hasSessionEnded(date: Date, endTime: string, now: Date): boolean {
    const [hours, minutes] = String(endTime || '23:59')
      .split(':')
      .map((value) => Number(value));
    const end = new Date(date);
    end.setHours(
      Number.isFinite(hours) ? hours : 23,
      Number.isFinite(minutes) ? minutes : 59,
      0,
      0,
    );

    return end.getTime() <= now.getTime();
  }

  private getUniqueAttendeesCount(session: {
    reservations?: { studentId: string }[];
    attendances?: { studentId: string }[];
  }): number {
    const studentIds = new Set<string>();

    for (const reservation of session.reservations || []) {
      if (reservation.studentId) {
        studentIds.add(reservation.studentId);
      }
    }

    for (const attendance of session.attendances || []) {
      if (attendance.studentId) {
        studentIds.add(attendance.studentId);
      }
    }

    return studentIds.size;
  }

  private async getActiveSettings() {
    const active = await this.prisma.teacherPaymentSetting.findFirst({
      where: {
        isActive: true,
      },
      include: {
        ranges: {
          orderBy: [
            { sortOrder: 'asc' },
            { minStudents: 'asc' },
          ],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (active) {
      return active;
    }

    const created = await this.prisma.teacherPaymentSetting.create({
      data: {
        minimumClassAmount: 50,
        cancellationWithPaymentAmount: null,
        isActive: true,
        ranges: {
          create: this.defaultRanges.map((range, index) => ({
            ...range,
            sortOrder: index,
          })),
        },
      },
      include: {
        ranges: {
          orderBy: [
            { sortOrder: 'asc' },
            { minStudents: 'asc' },
          ],
        },
      },
    });

    return created;
  }

  private mapSettingsResponse(settings: ActiveTeacherPaymentSettings): TeacherPaymentSettingsResponse {
    return {
      id: settings.id,
      minimumClassAmount: Number(settings.minimumClassAmount || 0),
      cancellationWithPaymentAmount: settings.cancellationWithPaymentAmount === null
        ? null
        : Number(settings.cancellationWithPaymentAmount || 0),
      isActive: settings.isActive,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
      ranges: settings.ranges.map((range) => ({
        id: range.id,
        minStudents: range.minStudents,
        maxStudents: range.maxStudents,
        amount: Number(range.amount || 0),
        sortOrder: range.sortOrder,
      })),
    };
  }

  private validateAndNormalizeRanges(ranges: Array<{
    minStudents: number;
    maxStudents?: number | null;
    amount: number;
  }>) {
    if (!Array.isArray(ranges) || ranges.length === 0) {
      throw new BadRequestException('Agrega al menos un rango de pago.');
    }

    const normalized = ranges
      .map((range) => ({
        minStudents: Number(range.minStudents),
        maxStudents: range.maxStudents === null || range.maxStudents === undefined || String(range.maxStudents) === ''
          ? null
          : Number(range.maxStudents),
        amount: this.roundMoney(Number(range.amount || 0)),
      }))
      .sort((a, b) => a.minStudents - b.minStudents);

    const seen = new Set<string>();
    let hasZeroCoverage = false;
    let hasOpenFinalRange = false;
    let previousMax = -1;

    for (const range of normalized) {
      if (!Number.isInteger(range.minStudents) || range.minStudents < 0) {
        throw new BadRequestException('El rango desde alumnos debe ser mayor o igual a 0.');
      }

      if (range.maxStudents !== null && (!Number.isInteger(range.maxStudents) || range.maxStudents < range.minStudents)) {
        throw new BadRequestException('El rango hasta alumnos debe ser mayor o igual que desde alumnos.');
      }

      if (!Number.isFinite(range.amount) || range.amount < 0) {
        throw new BadRequestException('Los montos de rangos deben ser mayores o iguales a 0.');
      }

      const key = `${range.minStudents}:${range.maxStudents ?? 'OPEN'}`;

      if (seen.has(key)) {
        throw new BadRequestException('No se permiten rangos duplicados.');
      }

      seen.add(key);

      if (range.minStudents <= 0 && (range.maxStudents === null || range.maxStudents >= 0)) {
        hasZeroCoverage = true;
      }

      if (range.minStudents <= previousMax) {
        throw new BadRequestException('Los rangos de pago no pueden traslaparse.');
      }

      if (range.maxStudents === null) {
        hasOpenFinalRange = true;
        previousMax = Number.MAX_SAFE_INTEGER;
        continue;
      }

      previousMax = range.maxStudents;
    }

    if (!hasZeroCoverage) {
      throw new BadRequestException('Debe existir un rango que cubra 0 alumnos.');
    }

    if (!hasOpenFinalRange) {
      throw new BadRequestException('Debe existir un rango final "en adelante".');
    }

    return normalized;
  }

  private getSessionTeacherPayment(session: {
    status: string;
    cancellationType?: ClassSessionCancellationType | null;
  }, attendeesCount: number, settings: ActiveTeacherPaymentSettings): number {
    if (session.status === 'CANCELLED') {
      return session.cancellationType === ClassSessionCancellationType.WITH_TEACHER_PAYMENT
        ? this.getCancellationWithPaymentAmount(settings)
        : 0;
    }

    return this.getClassTeacherPaymentAmountFromSettings(settings, attendeesCount);
  }

  private getSessionPaymentObservation(session: {
    status: string;
    cancellationType: ClassSessionCancellationType | null;
    cancellationReason: string | null;
  }, attendeesCount: number, settings: ActiveTeacherPaymentSettings): string {
    if (session.status === 'CANCELLED') {
      const reason = session.cancellationReason
        ? ` Motivo: ${session.cancellationReason}`
        : '';

      if (session.cancellationType === ClassSessionCancellationType.WITH_TEACHER_PAYMENT) {
        return `Cancelada con derecho a pago. Monto configurado: ${this.formatMoney(this.getCancellationWithPaymentAmount(settings))}.${reason}`;
      }

      return `Cancelada sin derecho a pago.${reason}`;
    }

    return `Pago según esquema configurable: ${attendeesCount} asistente(s)`;
  }

  private getClassTeacherPaymentAmountFromSettings(settings: ActiveTeacherPaymentSettings, attendeesCount: number): number {
    const safeAttendees = Math.max(0, Number(attendeesCount || 0));
    const range = settings.ranges.find((item) => {
      return safeAttendees >= item.minStudents &&
        (item.maxStudents === null || safeAttendees <= item.maxStudents);
    });

    return this.roundMoney(Number(range?.amount ?? settings.minimumClassAmount ?? 0));
  }

  private getCancellationWithPaymentAmount(settings: ActiveTeacherPaymentSettings): number {
    return this.roundMoney(
      Number(settings.cancellationWithPaymentAmount ?? settings.minimumClassAmount ?? 0),
    );
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
