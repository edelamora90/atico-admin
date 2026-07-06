import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { AttendancesService } from './attendances.service';

describe('AttendancesService', () => {
  let service: AttendancesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendancesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AttendancesService>(AttendancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fail when there is no sessionId or reservation with sessionId', async () => {
    await expect(
      service.create({
        studentId: 'student-1',
        status: AttendanceStatus.PRESENT,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classSession.findUnique).not.toHaveBeenCalled();
  });

  it('should deduplicate attendance by sessionId and studentId', async () => {
    const session = {
      id: 'session-1',
      classTemplateId: 'class-template-1',
      date: new Date('2030-01-01T10:00:00.000Z'),
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
    };

    prisma.classSession.findUnique.mockResolvedValue(session);
    prisma.class.findUnique.mockResolvedValue({
      id: 'class-template-1',
      area: 'DANCE',
      course: { name: 'Danza' },
      teacher: {},
      room: {},
    });
    prisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    prisma.attendance.findFirst.mockResolvedValue({
      id: 'attendance-1',
      studentId: 'student-1',
      sessionId: session.id,
    });

    await expect(
      service.create({
        studentId: 'student-1',
        sessionId: session.id,
        status: AttendanceStatus.PRESENT,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.attendance.findFirst).toHaveBeenCalledWith({
      where: {
        studentId: 'student-1',
        sessionId: session.id,
      },
    });
    expect(JSON.stringify(prisma.attendance.findFirst.mock.calls)).not.toContain(
      ['class', 'Id'].join(''),
    );
  });
});
