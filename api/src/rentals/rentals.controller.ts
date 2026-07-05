import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RentalsService } from './rentals.service';
import { CreateRentalDto } from './dto/create-rental.dto';

@Controller('rentals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPCION)
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateRentalDto) {
    return this.rentalsService.create(dto);
  }

  @Get()
  findAll() {
    return this.rentalsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentalsService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.rentalsService.remove(id);
  }
}
