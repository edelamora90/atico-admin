import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateTeacherPaymentSettingsDto } from './dto/update-teacher-payment-settings.dto';
import { TeacherPaymentsService } from './teacher-payments.service';

@Controller('teacher-payment-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class TeacherPaymentSettingsController {
  constructor(private readonly teacherPaymentsService: TeacherPaymentsService) {}

  @Get()
  settings() {
    return this.teacherPaymentsService.getSettings();
  }

  @Put()
  updateSettings(@Body() dto: UpdateTeacherPaymentSettingsDto) {
    return this.teacherPaymentsService.updateSettings(dto);
  }
}
