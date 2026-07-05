import { Module } from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';

@Module({
  controllers: [AttendancesController],
  providers: [AttendancesService],
  exports: [AttendancesService],
})
export class AttendancesModule {}
