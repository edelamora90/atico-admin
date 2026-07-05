import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FinancesService } from './finances.service';

@Controller('finances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class FinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Get('summary')
  summary(@Query() query: any) {
    return this.financesService.getSummary(query);
  }
}
