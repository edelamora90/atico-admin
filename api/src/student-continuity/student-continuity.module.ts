import { Module } from '@nestjs/common';

import { BusinessSettingsModule } from '../business-settings/business-settings.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StudentContinuityService } from './student-continuity.service';

@Module({
  imports: [PrismaModule, BusinessSettingsModule],
  providers: [StudentContinuityService],
  exports: [StudentContinuityService],
})
export class StudentContinuityModule {}
