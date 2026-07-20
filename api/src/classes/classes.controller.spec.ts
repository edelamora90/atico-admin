import { Test, TestingModule } from '@nestjs/testing';
import { ClassSessionService } from './class-session.service';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

describe('ClassesController', () => {
  let controller: ClassesController;
  const classesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    checkIn: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const classSessionServiceMock = {
    cancel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        {
          provide: ClassesService,
          useValue: classesServiceMock,
        },
        {
          provide: ClassSessionService,
          useValue: classSessionServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ClassesController>(ClassesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
