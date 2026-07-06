import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { ClassSessionService } from './class-session.service';

describe('ClassSessionService', () => {
  let service: ClassSessionService;
  let prisma: any;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassSessionService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ClassSessionService>(ClassSessionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return an existing session instead of creating a duplicate', async () => {
    const existing = {
      id: 'session-1',
      classTemplateId: 'class-template-1',
      date: new Date('2030-01-01T10:00:00.000Z'),
      startTime: '10:00',
      endTime: '11:00',
    };
    prisma.classSession.findFirst.mockResolvedValue(existing);

    const result = await service.findOrCreate({
      classTemplateId: existing.classTemplateId,
      date: existing.date,
      startTime: existing.startTime,
      endTime: existing.endTime,
      status: 'SCHEDULED',
    });

    expect(result).toBe(existing);
    expect(prisma.classSession.create).not.toHaveBeenCalled();
  });
});
