import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../test-utils/prisma.mock';
import { AdministratorsService } from './administrators.service';

describe('AdministratorsService', () => {
  let service: AdministratorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdministratorsService,
        {
          provide: PrismaService,
          useValue: createPrismaMock(),
        },
      ],
    }).compile();

    service = module.get<AdministratorsService>(AdministratorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
