import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StudentContinuityService } from '../student-continuity/student-continuity.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  let service: MembershipsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
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

    service = module.get<MembershipsService>(MembershipsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
