import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateAdministratorDto } from './dto/create-administrator.dto';
import { UpdateAdministratorDto } from './dto/update-administrator.dto';

type AuthActor = {
  id: string;
  role: UserRole;
};

@Injectable()
export class AdministratorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(actor: AuthActor, dto: CreateAdministratorDto) {
    this.ensureCanCreate(actor, dto.role);

    const username = this.normalizeUsername(dto.username);
    const email = this.normalizeEmail(dto.email);
    const password = await bcrypt.hash(dto.password, 10);

    try {
      const administrator = await this.prisma.administrator.create({
        data: {
          name: dto.name.trim(),
          username,
          email,
          password,
          role: dto.role,
        },
      });

      return this.toSafeUser(administrator);
    } catch (error) {
      this.handleUniqueEmailError(error);
      throw error;
    }
  }

  async findAll(actor: AuthActor) {
    const administrators = await this.prisma.administrator.findMany({
      where:
        actor.role === UserRole.ADMIN
          ? {
              role: {
                in: [UserRole.RECEPCION, UserRole.MAESTRO],
              },
            }
          : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return administrators.map((administrator) => this.toSafeUser(administrator));
  }

  async findOne(actor: AuthActor, id: string) {
    const administrator = await this.prisma.administrator.findUnique({
      where: { id },
    });

    if (!administrator) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    this.ensureCanRead(actor, administrator.role);

    return this.toSafeUser(administrator);
  }

  async update(actor: AuthActor, id: string, dto: UpdateAdministratorDto) {
    const current = await this.prisma.administrator.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    this.ensureCanModify(actor, current.role);

    if (actor.role === UserRole.ADMIN && dto.role && dto.role !== current.role) {
      throw new ForbiddenException('No tienes permisos para modificar este usuario.');
    }

    const data: Prisma.AdministratorUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.username !== undefined) {
      data.username = this.normalizeUsername(dto.username);
    }

    if (dto.email !== undefined) {
      data.email = this.normalizeEmail(dto.email);
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    try {
      const administrator = await this.prisma.administrator.update({
        where: { id },
        data,
      });

      return this.toSafeUser(administrator);
    } catch (error) {
      this.handleUniqueEmailError(error);
      throw error;
    }
  }

  async remove(actor: AuthActor, id: string) {
    if (actor.id === id) {
      throw new BadRequestException('No puedes eliminar tu propio usuario.');
    }

    const administrator = await this.prisma.administrator.findUnique({
      where: { id },
    });

    if (!administrator) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    this.ensureCanModify(actor, administrator.role);

    if (administrator.role === UserRole.SUPER_ADMIN) {
      const superAdminCount = await this.prisma.administrator.count({
        where: { role: UserRole.SUPER_ADMIN },
      });

      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'No puedes eliminar el último super administrador.',
        );
      }
    }

    const deleted = await this.prisma.administrator.delete({
      where: { id },
    });

    return this.toSafeUser(deleted);
  }

  private ensureCanCreate(actor: AuthActor, role: UserRole): void {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (actor.role === UserRole.ADMIN && role === UserRole.RECEPCION) {
      return;
    }

    throw new ForbiddenException('No tienes permisos para crear este tipo de usuario.');
  }

  private ensureCanRead(actor: AuthActor, targetRole: UserRole): void {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (
      actor.role === UserRole.ADMIN &&
      targetRole !== UserRole.SUPER_ADMIN &&
      targetRole !== UserRole.ADMIN
    ) {
      return;
    }

    throw new ForbiddenException('No tienes permisos para modificar este usuario.');
  }

  private ensureCanModify(actor: AuthActor, targetRole: UserRole): void {
    if (actor.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (actor.role === UserRole.ADMIN && targetRole === UserRole.RECEPCION) {
      return;
    }

    throw new ForbiddenException('No tienes permisos para modificar este usuario.');
  }

  private normalizeUsername(username: string): string {
    return username.toLowerCase().trim();
  }

  private normalizeEmail(email?: string | null): string | null {
    const normalized = email?.toLowerCase().trim();
    return normalized || null;
  }

  private handleUniqueEmailError(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta?.target.join(',')
        : String(error.meta?.target || '');

      if (target.includes('username')) {
        throw new BadRequestException(
          'Ya existe un usuario con este nombre de usuario.',
        );
      }

      throw new BadRequestException('Ya existe un usuario con este correo.');
    }
  }

  private toSafeUser(administrator: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: administrator.id,
      name: administrator.name,
      username: administrator.username,
      email: administrator.email,
      role: administrator.role,
      createdAt: administrator.createdAt,
      updatedAt: administrator.updatedAt,
    };
  }
}
