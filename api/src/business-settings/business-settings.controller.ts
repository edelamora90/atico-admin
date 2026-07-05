import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BusinessSettingsService } from './business-settings.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@Controller('business-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessSettingsController {
  constructor(private readonly businessSettingsService: BusinessSettingsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPCION)
  getSettings() {
    return this.businessSettingsService.getSettings();
  }

  @Patch()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateSettings(@Body() dto: UpdateBusinessSettingsDto) {
    return this.businessSettingsService.updateSettings(dto);
  }
}
