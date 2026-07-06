import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ClassType, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ReservationsService>(ReservationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail explicitly when sessionId is missing', async () => {
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });

    await expect(
      service.create({ studentId: 'student-1' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classSession.findUnique).not.toHaveBeenCalled();
  });

  it('should create reservations with sessionId and without legacy class identifier', async () => {
    const session = {
      id: 'session-1',
      classTemplateId: 'class-template-1',
      date: new Date('2030-01-01T10:00:00.000Z'),
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
    };
    const selectedClass = {
      id: 'class-template-1',
      type: ClassType.CLASS,
      area: 'DANCE',
      capacity: 10,
      recurrenceType: 'NONE',
      course: { name: 'Danza' },
      teacher: {},
      room: {},
    };
    const membership = {
      id: 'membership-1',
      availableCredits: 3,
    };
    const createdReservation = {
      id: 'reservation-1',
      studentId: 'student-1',
      sessionId: session.id,
      status: ReservationStatus.RESERVED,
    };

    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    prisma.classSession.findUnique.mockResolvedValue(session);
    prisma.class.findUnique.mockResolvedValue(selectedClass);
    prisma.reservation.count.mockResolvedValue(0);
    prisma.reservation.findFirst.mockResolvedValue(null);
    prisma.membership.findFirst.mockResolvedValue(membership);
    prisma.reservation.create.mockResolvedValue({ id: createdReservation.id });
    prisma.membership.updateMany.mockResolvedValue({ count: 1 });
    prisma.creditTransaction.create.mockResolvedValue({});
    prisma.reservation.findUnique.mockResolvedValue(createdReservation);

    const result = await service.create({
      studentId: 'student-1',
      sessionId: session.id,
    });

    expect(result).toEqual(createdReservation);
    expect(prisma.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          studentId: 'student-1',
          sessionId: session.id,
        }),
      }),
    );
    expect(JSON.stringify(prisma.reservation.create.mock.calls)).not.toContain(
      ['class', 'Id'].join(''),
    );
  });
});
