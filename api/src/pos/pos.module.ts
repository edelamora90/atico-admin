import { Module } from '@nestjs/common';

import { StudentContinuityModule } from '../student-continuity/student-continuity.module';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

@Module({
  imports: [StudentContinuityModule],
  controllers: [PosController],
  providers: [PosService],
})
export class PosModule {}
