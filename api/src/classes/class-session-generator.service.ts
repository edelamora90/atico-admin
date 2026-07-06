import { Injectable } from '@nestjs/common';
import { Class, ClassSession, Prisma, RecurrenceType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { getSessionDates } from '../utils/recurrence.util';
import { ClassSessionService } from './class-session.service';

type ClassWithSessionFields = Class & {
  sessions?: ClassSession[];
};

type WeeklySchedule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

@Injectable()
export class ClassSessionGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classSessionService: ClassSessionService,
  ) {}

  buildSessions(selectedClass: ClassWithSessionFields) {
    if (selectedClass.recurrenceType === RecurrenceType.NONE) {
      return [];
    }

    const start = selectedClass.recurrenceStart || selectedClass.startDate;
    const end = this.getGenerationEnd(selectedClass, start);
    const weeklySchedules = this.getWeeklySchedules(selectedClass);

    if (weeklySchedules.length > 0) {
      return weeklySchedules.flatMap((schedule) => {
        return getSessionDates(start, end, [schedule.dayOfWeek]).map((date) => ({
          classTemplateId: selectedClass.id,
          date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          status: 'SCHEDULED',
          roomId: selectedClass.roomId,
          teacherId: selectedClass.teacherId,
        }));
      });
    }

    const daysOfWeek = selectedClass.recurrenceType === RecurrenceType.CUSTOM
      ? selectedClass.daysOfWeek || []
      : selectedClass.daysOfWeek;
    const startTime = selectedClass.startTime || this.formatTime(selectedClass.startDate);
    const endTime = selectedClass.endTime || this.formatEndTime(selectedClass);

    return getSessionDates(start, end, daysOfWeek).map((date) => ({
      classTemplateId: selectedClass.id,
      date,
      startTime,
      endTime,
      status: 'SCHEDULED',
      roomId: selectedClass.roomId,
      teacherId: selectedClass.teacherId,
    }));
  }

  async regenerateFutureSessions(selectedClass: ClassWithSessionFields) {
    if (selectedClass.recurrenceType === RecurrenceType.NONE) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.classSession.deleteMany({
      where: {
        classTemplateId: selectedClass.id,
        status: {
          not: 'COMPLETED',
        },
        date: {
          gte: today,
        },
        reservations: {
          none: {},
        },
        attendances: {
          none: {},
        },
      },
    });

    const existingFutureSessions = await this.prisma.classSession.findMany({
      where: {
        classTemplateId: selectedClass.id,
        date: {
          gte: today,
        },
      },
    });
    const existingKeys = new Set(
      existingFutureSessions.map((session) => this.getSessionKey(session)),
    );
    const sessions = this.buildSessions(selectedClass)
      .filter((session) => session.date >= today)
      .filter((session) => !existingKeys.has(this.getSessionKey(session)));

    if (sessions.length === 0) {
      return existingFutureSessions;
    }

    await this.classSessionService.findOrCreateMany(sessions);

    return this.prisma.classSession.findMany({
      where: {
        classTemplateId: selectedClass.id,
        date: {
          gte: today,
        },
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  private getSessionKey(session: {
    date: Date;
    startTime: string;
    endTime: string;
  }) {
    return `${this.getDateKey(session.date)}|${session.startTime}|${session.endTime}`;
  }

  private getDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private formatEndTime(selectedClass: Class) {
    if (selectedClass.endDate) {
      return this.formatTime(selectedClass.endDate);
    }

    const endDate = new Date(selectedClass.startDate);
    endDate.setMinutes(endDate.getMinutes() + Number(selectedClass.durationMinutes || 0));
    return this.formatTime(endDate);
  }

  private getGenerationEnd(selectedClass: Class, start: Date): Date {
    if (selectedClass.recurrenceEnd) {
      return selectedClass.recurrenceEnd;
    }

    if (selectedClass.endDate && selectedClass.endDate > start) {
      return selectedClass.endDate;
    }

    const rollingEnd = new Date(start);
    rollingEnd.setFullYear(rollingEnd.getFullYear() + 1);
    return rollingEnd;
  }

  private getWeeklySchedules(selectedClass: Class): WeeklySchedule[] {
    if (!selectedClass.weeklySchedules) {
      return [];
    }

    const value = selectedClass.weeklySchedules as Prisma.JsonValue;

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }

        const schedule = item as Record<string, unknown>;

        return {
          dayOfWeek: Number(schedule.dayOfWeek),
          startTime: String(schedule.startTime || ''),
          endTime: String(schedule.endTime || ''),
        };
      })
      .filter((item): item is WeeklySchedule => {
        return !!item &&
          Number.isInteger(item.dayOfWeek) &&
          item.dayOfWeek >= 0 &&
          item.dayOfWeek <= 6 &&
          !!item.startTime &&
          !!item.endTime;
      });
  }
}
