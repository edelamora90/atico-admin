import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AcademicArea } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreatePackageDto) {
    this.validateOperationalArea(dto.area);

    const teacherPercentage = Number(dto.teacherPercentage || 0);
    const atticPercentage = 100 - teacherPercentage;

    const pricePerClass =
      Number(dto.credits || 0) > 0
        ? Number(dto.price || 0) / Number(dto.credits || 0)
        : 0;

    const teacherPaymentPerClass =
      pricePerClass * (teacherPercentage / 100);

    const packageType = dto.type || 'PACKAGE';

    const requiresEnrollment =
      packageType === 'PROMOTION'
        ? dto.requiresEnrollment ?? true
        : packageType === 'PACKAGE';

    const isTrial = packageType === 'TRIAL';

    return this.prisma.package.create({
      data: {
        name: dto.name,
        type: packageType,
        price: dto.price,
        credits: dto.credits,
        teacherPercentage,
        atticPercentage,
        teacherPaymentPerClass,
        area: dto.area || 'DANCE',
        requiresEnrollment,
        includesFreeInscription: dto.includesFreeInscription ?? false,
        isTrial,
        active: dto.active ?? true,
      },
    });
  }

  findAll() {
    return this.prisma.package.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        memberships: true,
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.package.findUnique({
      where: { id },
      include: {
        memberships: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Paquete no encontrado');
    }

    return item;
  }

  async update(id: string, dto: UpdatePackageDto) {
    const current = await this.prisma.package.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Paquete no encontrado');
    }

    const packageType = dto.type ?? current.type;
    const teacherPercentage = Number(
      dto.teacherPercentage ?? current.teacherPercentage,
    );
    const price = Number(dto.price ?? current.price);
    const credits = Number(dto.credits ?? current.credits);
    const area = dto.area ?? current.area;
    const typeChanged = dto.type !== undefined && dto.type !== current.type;
    const requiresEnrollment =
      dto.requiresEnrollment !== undefined
        ? dto.requiresEnrollment
        : typeChanged
          ? packageType === 'PROMOTION'
            ? true
            : packageType === 'PACKAGE'
          : current.requiresEnrollment;
    const includesFreeInscription =
      dto.includesFreeInscription ?? current.includesFreeInscription;
    const isTrial = packageType === 'TRIAL';

    this.validateOperationalArea(area);
    this.validatePackageNumbers({
      price,
      credits,
      teacherPercentage,
    });

    const atticPercentage = 100 - teacherPercentage;
    const teacherPaymentPerClass =
      (price / credits) * (teacherPercentage / 100);

    return this.prisma.package.update({
      where: { id },
      data: {
        name: dto.name ?? current.name,
        type: packageType,
        price,
        credits,
        teacherPercentage,
        atticPercentage,
        teacherPaymentPerClass,
        area,
        requiresEnrollment,
        includesFreeInscription,
        isTrial,
        active: dto.active ?? current.active,
      },
    });
  }

  async remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.findOne(id);
    const reason = normalizeAuditReason(
      input.reason,
      'Desactivación de paquete desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.package.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date(),
          deletionReason: reason,
          deletedById: input.actorId || null,
        },
        include: {
          memberships: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'PACKAGE_DEACTIVATE',
          entityType: 'Package',
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

  private validateOperationalArea(area?: AcademicArea): void {
    if (area === AcademicArea.BOTH) {
      throw new BadRequestException('Solo se permiten paquetes de Danza o Música.');
    }
  }

  private validatePackageNumbers(input: {
    price: number;
    credits: number;
    teacherPercentage: number;
  }): void {
    if (!Number.isFinite(input.price) || input.price < 0) {
      throw new BadRequestException('El precio no puede ser menor a 0.');
    }

    if (!Number.isFinite(input.credits) || input.credits <= 0) {
      throw new BadRequestException('Los créditos deben ser mayores a 0.');
    }

    if (
      !Number.isFinite(input.teacherPercentage) ||
      input.teacherPercentage < 0 ||
      input.teacherPercentage > 100
    ) {
      throw new BadRequestException(
        'El porcentaje de docencia debe estar entre 0 y 100.',
      );
    }
  }
}
