import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { StoreService } from './store.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { getActorId } from '../utils/audit-log.util';

@Controller('store')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPCION)
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Post('products/upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (req, file, callback) => {
          const uniqueName =
            Date.now() +
            '-' +
            Math.round(Math.random() * 1e9) +
            extname(file.originalname);

          callback(null, uniqueName);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(new Error('Solo se permiten imágenes jpg, png o webp'), false);
        }

        callback(null, true);
      },
      limits: {
        fileSize: 3 * 1024 * 1024,
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return {
      imageUrl: `/uploads/products/${file.filename}`,
    };
  }

  @Post('products')
  createProduct(@Body() dto: CreateProductDto) {
    return this.storeService.createProduct(dto);
  }

  @Get('products')
  findProducts() {
    return this.storeService.findProducts();
  }

  @Patch('products/:id')
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.storeService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  removeProduct(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.storeService.removeProduct(id, {
      reason: body?.reason,
      actorId: getActorId(req.user),
    });
  }

  @Post('sales')
  createSale(@Body() dto: CreateSaleDto) {
    return this.storeService.createSale(dto);
  }

  @Post('checkout')
  checkout(@Body() dto: CheckoutDto) {
    return this.storeService.checkout(dto);
  }

  @Get('sales')
  findSales() {
    return this.storeService.findSales();
  }

  @Get('dashboard')
  dashboard() {
    return this.storeService.dashboard();
  }
}
