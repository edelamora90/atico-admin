import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomItemDto } from './dto/create-room-item.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }

  @Post(':id/items')
  createItem(
    @Param('id') id: string,
    @Body() dto: CreateRoomItemDto,
  ) {
    return this.roomsService.createItem(id, dto);
  }

  @Patch('items/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: CreateRoomItemDto,
  ) {
    return this.roomsService.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string) {
    return this.roomsService.removeItem(itemId);
  }
}
