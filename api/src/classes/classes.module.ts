import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassSessionService } from './class-session.service';
import { ClassSessionGeneratorService } from './class-session-generator.service';
import { ClassesService } from './classes.service';
import { TeacherPaymentsModule } from '../teacher-payments/teacher-payments.module';

@Module({
  imports: [TeacherPaymentsModule],
  controllers: [ClassesController],
  providers: [ClassesService, ClassSessionGeneratorService, ClassSessionService],
  exports: [ClassSessionGeneratorService, ClassSessionService],
})
export class ClassesModule {}
