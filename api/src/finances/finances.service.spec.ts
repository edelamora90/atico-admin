import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
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
      ],
    }).compile();

    service = module.get<FinancesService>(FinancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should build session-only finance keys', () => {
    expect((service as any).getSessionFinanceKey('session-1', 'student-1')).toBe(
      'SESSION:session-1:student-1',
    );
  });

  it('should deduplicate teacher payment rows by sessionId and studentId', async () => {
    prisma.membership.findMany.mockResolvedValue([
      {
        id: 'membership-1',
        package: {
          name: 'Danza 4',
          price: 400,
          credits: 4,
          teacherPercentage: 50,
          teacherPaymentPerClass: 50,
        },
      },
    ]);

    const session = {
      id: 'session-1',
      startTime: '10:00',
      endTime: '11:00',
    };
    const rows = await (service as any).getTeacherPaymentRows(
      [
        {
          id: 'attendance-1',
          studentId: 'student-1',
          sessionId: session.id,
          student: { name: 'Alumno QA' },
          session,
        },
      ],
      [
        {
          id: 'reservation-1',
          studentId: 'student-1',
          sessionId: session.id,
          student: { name: 'Alumno QA' },
          creditMembershipId: 'membership-1',
          session,
        },
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        studentId: 'student-1',
        sessionId: session.id,
        teacherPayment: 50,
      }),
    );
    expect(JSON.stringify(rows)).not.toContain(`LEGACY${':'}`);
  });
});
