import { Module } from '@nestjs/common';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';
import { TeacherPaymentsModule } from '../teacher-payments/teacher-payments.module';

@Module({
  imports: [TeacherPaymentsModule],
  controllers: [FinancesController],
  providers: [FinancesService],
})
export class FinancesModule {}
