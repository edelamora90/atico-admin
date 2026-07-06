import { Test, TestingModule } from '@nestjs/testing';
import { AdministratorsController } from './administrators.controller';
import { AdministratorsService } from './administrators.service';

describe('AdministratorsController', () => {
  let controller: AdministratorsController;
  const administratorsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorsController],
      providers: [
        {
          provide: AdministratorsService,
          useValue: administratorsServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AdministratorsController>(AdministratorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
