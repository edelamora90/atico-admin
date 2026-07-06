import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

type ClassSessionCreateData = Prisma.ClassSessionUncheckedCreateInput;

@Injectable()
export class ClassSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(data: ClassSessionCreateData, client = this.prisma) {
    const existing = await client.classSession.findFirst({
      where: {
        classTemplateId: data.classTemplateId,
        date: this.getDayRange(new Date(data.date)),
        startTime: data.startTime,
        endTime: data.endTime,
      },
    });

    if (existing) {
      return existing;
    }

    return client.classSession.create({
      data,
    });
  }

  async findOrCreateMany(items: ClassSessionCreateData[], client = this.prisma) {
    const sessions: Awaited<ReturnType<ClassSessionService['findOrCreate']>>[] = [];

    for (const item of items) {
      sessions.push(await this.findOrCreate(item, client));
    }

    return sessions;
  }

  private getDayRange(date: Date) {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    return {
      gte: from,
      lt: to,
    };
  }
}
