import { Module } from '@nestjs/common';
import { TeacherPaymentSettingsController } from './teacher-payment-settings.controller';
import { TeacherPaymentsController } from './teacher-payments.controller';
import { TeacherPaymentsService } from './teacher-payments.service';

@Module({
  controllers: [TeacherPaymentsController, TeacherPaymentSettingsController],
  providers: [TeacherPaymentsService],
  exports: [TeacherPaymentsService],
})
export class TeacherPaymentsModule {}
