import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdministratorsService } from './administrators.service';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

@Controller('administrators')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdministratorsController {
  constructor(private readonly administratorsService: AdministratorsService) {}

  @Post()
  create(@Req() request: any, @Body() dto: CreateAdministratorDto) {
    return this.administratorsService.create(request.user, dto);
  }

  @Get()
  findAll(@Req() request: any) {
    return this.administratorsService.findAll(request.user);
  }

  @Get(':id')
  findOne(@Req() request: any, @Param('id') id: string) {
    return this.administratorsService.findOne(request.user, id);
  }

  @Patch(':id')
  update(
    @Req() request: any,
    @Param('id') id: string,
    @Body() dto: UpdateAdministratorDto,
  ) {
    return this.administratorsService.update(request.user, id, dto);
  }

  @Delete(':id')
  remove(@Req() request: any, @Param('id') id: string) {
    return this.administratorsService.remove(request.user, id);
  }
}
