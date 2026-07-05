import { Test, TestingModule } from '@nestjs/testing';
import { AdministratorsController } from './administrators.controller';

describe('AdministratorsController', () => {
  let controller: AdministratorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdministratorsController],
    }).compile();

    controller = module.get<AdministratorsController>(AdministratorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
