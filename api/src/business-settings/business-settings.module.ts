import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { PrismaModule } from '../prisma/prisma.module';
import { BusinessSettingsController } from './business-settings.controller';
import { BusinessSettingsService } from './business-settings.service';

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
  controllers: [BusinessSettingsController],
  providers: [BusinessSettingsService],
  exports: [BusinessSettingsService],
})
export class BusinessSettingsModule {}
