import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
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

  async remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.findOne(id);
    const reason = normalizeAuditReason(
      input.reason,
      'Desactivación de salón desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({
        where: { id },
        data: {
          active: false,
        },
        include: {
          items: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ROOM_DEACTIVATE',
          entityType: 'Room',
          entityId: id,
          actorId: input.actorId || null,
          reason,
          before: toAuditJson(current),
          after: toAuditJson(updated),
        },
      });

      return updated;
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

  async removeItem(itemId: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.prisma.roomItem.findUnique({
      where: { id: itemId },
    });

    if (!current) {
      throw new NotFoundException('Extra de salón no encontrado');
    }

    const reason = normalizeAuditReason(
      input.reason,
      'Desactivación de extra de salón desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.roomItem.update({
        where: { id: itemId },
        data: {
          active: false,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'ROOM_ITEM_DEACTIVATE',
          entityType: 'RoomItem',
          entityId: itemId,
          actorId: input.actorId || null,
          reason,
          before: toAuditJson(current),
          after: toAuditJson(updated),
        },
      });

      return updated;
    });
  }
}
