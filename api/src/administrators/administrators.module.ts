import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { AdministratorsController } from './administrators.controller';
import { AdministratorsService } from './administrators.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'atico-dev-secret',
      signOptions: {
        expiresIn: '12h',
      },
    }),
  ],
  controllers: [AdministratorsController],
  providers: [AdministratorsService]
})
export class AdministratorsModule {}
