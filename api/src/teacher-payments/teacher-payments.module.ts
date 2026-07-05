import { Module } from '@nestjs/common';
import { AttendancesModule } from '../attendances/attendances.module';
import { TeacherPaymentsController } from './teacher-payments.controller';
import { TeacherPaymentsService } from './teacher-payments.service';

@Module({
  imports: [AttendancesModule],
  controllers: [TeacherPaymentsController],
  providers: [TeacherPaymentsService],
})
export class TeacherPaymentsModule {}
