import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CheckoutPosDto } from './dto/checkout-pos.dto';
import { CancelPosSaleDto } from './dto/cancel-pos-sale.dto';
import { PosService } from './pos.service';

@Controller('pos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPCION)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('checkout')
  checkout(@Body() dto: CheckoutPosDto) {
    return this.posService.checkout(dto);
  }

  @Get('sales')
  findSales(@Query() query: any) {
    return this.posService.findSales(query);
  }

  @Get('sales/:id')
  findSale(@Param('id') id: string) {
    return this.posService.findSale(id);
  }

  @Patch('sales/:id/cancel')
  cancelSale(
    @Param('id') id: string,
    @Body() dto: CancelPosSaleDto,
    @Req() req: any,
  ) {
    return this.posService.cancelSale(id, dto, req.user?.id);
  }

  @Get('cash-cut')
  getCashCut(@Query() query: any) {
    return this.posService.getCashCut(query);
  }

  @Post('cash-close')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  createCashClose(@Body() dto: any) {
    return this.posService.createCashClose(dto);
  }

  @Get('cash-close')
  findCashCloses(@Query() query: any) {
    return this.posService.findCashCloses(query);
  }
}
