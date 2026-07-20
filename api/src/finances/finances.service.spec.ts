import { ClassSessionCancellationType } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherPaymentsService } from '../teacher-payments/teacher-payments.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { FinancesService } from './finances.service';

describe('FinancesService', () => {
  let service: FinancesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: TeacherPaymentsService,
          useValue: {
            getSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FinancesService>(FinancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should map class cancellation with teacher payment as an expense', () => {
    const movement = (service as any).mapTeacherPaymentMovement({
      id: 'CLASS_SESSION-session-1',
      date: new Date('2026-07-19T10:00:00.000Z').toISOString(),
      teacherId: 'teacher-1',
      teacherName: 'Docente QA',
      sessionId: 'session-1',
      className: 'Danza QA',
      area: 'DANCE',
      studentId: null,
      studentName: '0 alumnos',
      packageName: 'Cancelada con derecho a pago. Motivo: Lluvia',
      packageArea: null,
      teacherPayment: 50,
      attendeesCount: 0,
      observation: 'Cancelada con derecho a pago. Motivo: Lluvia',
      cancellationType: ClassSessionCancellationType.WITH_TEACHER_PAYMENT,
      cancellationReason: 'Lluvia',
      source: 'CLASS_SESSION',
    });

    expect(movement).toEqual(
      expect.objectContaining({
        concept: 'Cancelación de clase con derecho a pago',
        amount: 50,
        type: 'EXPENSE',
        source: 'TEACHER_PAYMENT',
        sessionId: 'session-1',
        cancellationReason: 'Lluvia',
      }),
    );
  });

  it('should map class cancellation without teacher payment as informational', () => {
    const movement = (service as any).mapTeacherPaymentMovement({
      id: 'CLASS_SESSION-session-2',
      date: new Date('2026-07-19T11:00:00.000Z').toISOString(),
      teacherId: 'teacher-1',
      teacherName: 'Docente QA',
      sessionId: 'session-2',
      className: 'Danza QA',
      area: 'DANCE',
      studentId: null,
      studentName: '0 alumnos',
      packageName: 'Cancelada sin derecho a pago. Motivo: Sin alumnos',
      packageArea: null,
      teacherPayment: 0,
      attendeesCount: 0,
      observation: 'Cancelada sin derecho a pago. Motivo: Sin alumnos',
      cancellationType: ClassSessionCancellationType.WITHOUT_TEACHER_PAYMENT,
      cancellationReason: 'Sin alumnos',
      source: 'CLASS_SESSION',
    });

    expect(movement).toEqual(
      expect.objectContaining({
        concept: 'Cancelación de clase sin derecho a pago',
        amount: 0,
        type: 'INFO',
        source: 'CLASS_CANCELLATION',
        sessionId: 'session-2',
        cancellationReason: 'Sin alumnos',
      }),
    );
  });
});
