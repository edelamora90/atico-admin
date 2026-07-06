import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StudentContinuityService } from '../student-continuity/student-continuity.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  let service: StudentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        {
          provide: PrismaService,
          useValue: createPrismaMock(),
        },
        {
          provide: StudentContinuityService,
          useValue: {
            getStudentContinuity: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
