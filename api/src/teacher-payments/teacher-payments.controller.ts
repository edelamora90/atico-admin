import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateTeacherPaymentSettingsDto } from './dto/update-teacher-payment-settings.dto';
import { TeacherPaymentsService } from './teacher-payments.service';

@Controller('teacher-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class TeacherPaymentsController {
  constructor(private readonly teacherPaymentsService: TeacherPaymentsService) {}

  @Get('summary')
  summary(@Query() query: any) {
    return this.teacherPaymentsService.getSummary(query);
  }

  @Get('settings')
  settings() {
    return this.teacherPaymentsService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() dto: UpdateTeacherPaymentSettingsDto) {
    return this.teacherPaymentsService.updateSettings(dto);
  }
}
