import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { CreateRoomItemDto } from './dto/create-room-item.dto';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        name: dto.name,
        capacity: dto.capacity,
        basePrice: dto.basePrice ?? 0,
        active: dto.active ?? true,
      },
      include: {
        items: true,
      },
    });
  }

  findAll() {
    return this.prisma.room.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Espacio no encontrado');
    }

    return room;
  }

  update(id: string, dto: UpdateRoomDto) {
    return this.prisma.room.update({
      where: { id },
      data: {
        name: dto.name,
        capacity: dto.capacity,
        basePrice: dto.basePrice,
        active: dto.active,
      },
      include: {
        items: true,
      },
    });
  }

  remove(id: string) {
    return this.prisma.room.delete({
      where: { id },
    });
  }

  createItem(roomId: string, dto: CreateRoomItemDto) {
    return this.prisma.roomItem.create({
      data: {
        roomId,
        name: dto.name,
        price: dto.price,
        active: dto.active ?? true,
      },
    });
  }

  updateItem(itemId: string, dto: CreateRoomItemDto) {
    return this.prisma.roomItem.update({
      where: { id: itemId },
      data: {
        name: dto.name,
        price: dto.price,
        active: dto.active ?? true,
      },
    });
  }

  removeItem(itemId: string) {
    return this.prisma.roomItem.delete({
      where: { id: itemId },
    });
  }
}
