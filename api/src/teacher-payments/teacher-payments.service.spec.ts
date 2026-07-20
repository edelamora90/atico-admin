import { Test, TestingModule } from '@nestjs/testing';
import { ClassSessionCancellationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { TeacherPaymentsService } from './teacher-payments.service';

describe('TeacherPaymentsService', () => {
  let service: TeacherPaymentsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.posSaleItem.findMany.mockResolvedValue([]);
    prisma.teacherPaymentSetting.findFirst.mockResolvedValue({
      id: 'setting-1',
      minimumClassAmount: 50,
      cancellationWithPaymentAmount: null,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      ranges: [
        {
          id: 'range-1',
          minStudents: 0,
          maxStudents: 1,
          amount: 50,
          sortOrder: 0,
        },
        {
          id: 'range-2',
          minStudents: 2,
          maxStudents: null,
          amount: 80,
          sortOrder: 1,
        },
      ],
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherPaymentsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<TeacherPaymentsService>(TeacherPaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate normal class payment by attendees table per session', async () => {
    prisma.classSession.findMany.mockResolvedValue([
      {
        id: 'session-1',
        date: new Date('2020-01-01T10:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        status: 'SCHEDULED',
        cancellationType: null,
        cancellationReason: null,
        class: {
          id: 'class-1',
          title: 'Salsa',
          type: 'CLASS',
          area: 'DANCE',
          teacherId: 'teacher-1',
          teacher: { id: 'teacher-1', name: 'Docente QA' },
        },
        reservations: [
          { studentId: 'student-1' },
        ],
        attendances: [
          { studentId: 'student-2' },
        ],
      },
    ]);

    const result = await service.getSummary({ period: 'all' });

    expect(result.totals.sessionsCount).toBe(1);
    expect(result.totals.teacherPaymentTotal).toBe(80);
    expect(result.totals.payableAttendancesCount).toBe(2);
    expect(result.items[0].observation).toBe('Pago según esquema configurable: 2 asistente(s)');
    expect(JSON.stringify(result)).not.toContain(['class', 'Id'].join(''));
  });

  it('should keep cancelled sessions without payment auditable with zero amount', async () => {
    prisma.classSession.findMany.mockResolvedValue([
      {
        id: 'session-cancelled',
        date: new Date('2030-01-01T10:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        status: 'CANCELLED',
        cancellationType: ClassSessionCancellationType.WITHOUT_TEACHER_PAYMENT,
        cancellationReason: 'Cierre operativo',
        class: {
          id: 'class-1',
          title: 'Salsa',
          type: 'CLASS',
          area: 'DANCE',
          teacherId: 'teacher-1',
          teacher: { id: 'teacher-1', name: 'Docente QA' },
        },
        reservations: [],
        attendances: [],
      },
    ]);

    const result = await service.getSummary({ period: 'all' });

    expect(result.totals.sessionsCount).toBe(1);
    expect(result.totals.teacherPaymentTotal).toBe(0);
    expect(result.items[0].observation).toContain('Cancelada sin derecho a pago');
    expect(result.items[0].observation).toContain('Cierre operativo');
  });
});
