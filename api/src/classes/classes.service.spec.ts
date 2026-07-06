import { Test, TestingModule } from '@nestjs/testing';
import { RecurrenceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { ClassSessionGeneratorService } from './class-session-generator.service';
import { ClassesService } from './classes.service';

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: any;
  const classSessionGeneratorMock = {
    regenerateFutureSessions: jest.fn(),
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    classSessionGeneratorMock.regenerateFutureSessions.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ClassSessionGeneratorService,
          useValue: classSessionGeneratorMock,
        },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should regenerate sessions when creating a recurring class', async () => {
    const room = { id: 'room-1', items: [] };
    const teacher = { id: 'teacher-1' };
    const course = { id: 'course-1' };
    const createdClass = {
      id: 'class-template-1',
      roomId: room.id,
      teacherId: teacher.id,
      recurrenceType: RecurrenceType.WEEKLY,
      sessions: [],
    };
    const refreshedClass = {
      ...createdClass,
      sessions: [
        {
          id: 'session-1',
          classTemplateId: createdClass.id,
          date: new Date('2030-01-07T00:00:00.000Z'),
          startTime: '17:00',
          endTime: '18:00',
          status: 'SCHEDULED',
        },
      ],
    };

    prisma.room.findUnique.mockResolvedValue(room);
    prisma.teacher.findUnique.mockResolvedValue(teacher);
    prisma.course.findFirst.mockResolvedValue(course);
    prisma.class.create.mockResolvedValue(createdClass);
    prisma.class.findUnique.mockResolvedValue(refreshedClass);

    const result = await service.create({
      roomId: room.id,
      teacherId: teacher.id,
      type: 'CLASS',
      area: 'DANCE',
      title: 'Salsa',
      startDate: '2030-01-07T17:00:00.000Z',
      endDate: '2030-01-07T18:00:00.000Z',
      durationMinutes: 60,
      capacity: 10,
      recurrenceType: 'WEEKLY',
      daysOfWeek: [1],
      startTime: '17:00',
      endTime: '18:00',
      recurrenceStart: '2030-01-07T17:00:00.000Z',
      recurrenceEnd: '2030-01-14T18:00:00.000Z',
    } as any);

    expect(classSessionGeneratorMock.regenerateFutureSessions).toHaveBeenCalledWith(
      createdClass,
    );
    expect(result.sessions).toHaveLength(1);
  });
});
