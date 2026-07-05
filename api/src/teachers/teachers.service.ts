import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateTeacherDto) {
    return this.prisma.teacher.create({
      data: {
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        active: dto.active ?? true,
      },
    });
  }

  findAll() {
    return this.prisma.teacher.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        classes: {
          include: {
            course: true,
            room: true,
            reservations: true,
            attendances: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            course: true,
            room: true,
            reservations: true,
            attendances: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('Docente no encontrado');
    }

    return teacher;
  }

  update(id: string, dto: UpdateTeacherDto) {
    return this.prisma.teacher.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        active: dto.active,
      },
    });
  }

  remove(id: string) {
    return this.prisma.teacher.delete({
      where: { id },
    });
  }
}
