import { Injectable } from '@nestjs/common';
import { Prisma, RenewalPolicy } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class BusinessSettingsService {
  constructor(private prisma: PrismaService) {}

  getSettings(client: PrismaClientLike = this.prisma) {
    return this.ensureSettings(client);
  }

  async updateSettings(dto: UpdateBusinessSettingsDto) {
    const current = await this.ensureSettings(this.prisma);

    return this.prisma.businessSettings.update({
      where: { id: current.id },
      data: {
        renewalPolicy: dto.renewalPolicy,
        renewalGraceDays: dto.renewalGraceDays,
        renewalFeeAmount: dto.renewalFeeAmount,
      },
    });
  }

  private async ensureSettings(client: PrismaClientLike) {
    const existing = await client.businessSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (existing) {
      return existing;
    }

    return client.businessSettings.create({
      data: {
        id: 'default',
        renewalPolicy: RenewalPolicy.BY_MEMBERSHIP_EXPIRATION,
        renewalGraceDays: 15,
        renewalFeeAmount: 100,
      },
    });
  }
}
