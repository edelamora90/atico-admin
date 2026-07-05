import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { StudentContinuityModule } from '../student-continuity/student-continuity.module';

@Module({
  imports: [StudentContinuityModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
