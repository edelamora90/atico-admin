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
import { ClassesService } from './classes.service';
import { ClassSessionService } from './class-session.service';
import { CancelClassSessionDto } from './dto/cancel-class-session.dto';
import { CheckInClassDto } from './dto/check-in-class.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { getActorId } from '../utils/audit-log.util';

@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPCION)
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly classSessionService: ClassSessionService,
  ) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  @Get()
  findAll() {
    return this.classesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Post('sessions/:sessionId/check-in')
  checkIn(@Param('sessionId') sessionId: string, @Body() dto: CheckInClassDto) {
    return this.classesService.checkIn({
      ...dto,
      sessionId,
    });
  }

  @Patch('sessions/:sessionId/cancel')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  cancelSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: CancelClassSessionDto,
    @Req() req: any,
  ) {
    return this.classSessionService.cancel(sessionId, {
      ...dto,
      cancelledById: getActorId(req.user),
    });
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.classesService.remove(id, {
      reason: body?.reason,
      actorId: getActorId(req.user),
    });
  }
}
