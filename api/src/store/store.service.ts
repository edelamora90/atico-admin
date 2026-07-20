import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CheckoutDto } from './dto/checkout.dto';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  createProduct(dto: CreateProductDto) {
    return this.prisma.storeProduct.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        imageUrl: dto.imageUrl || null,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        stock: dto.stock,
        active: dto.active ?? true,
      },
      include: {
        sales: true,
      },
    });
  }

  findProducts() {
    return this.prisma.storeProduct.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sales: true,
      },
    });
  }

  updateProduct(id: string, dto: UpdateProductDto) {
    return this.prisma.storeProduct.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        stock: dto.stock,
        active: dto.active,
      },
      include: {
        sales: true,
      },
    });
  }

  async removeProduct(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.prisma.storeProduct.findUnique({
      where: { id },
      include: {
        sales: true,
      },
    });

    if (!current) {
      throw new NotFoundException('Producto no encontrado');
    }

    const reason = normalizeAuditReason(
      input.reason,
      'Desactivación de producto desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.storeProduct.update({
        where: { id },
        data: {
          active: false,
          deletedAt: new Date(),
          deletionReason: reason,
          deletedById: input.actorId || null,
        },
        include: {
          sales: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'STORE_PRODUCT_DEACTIVATE',
          entityType: 'StoreProduct',
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

  async createSale(dto: CreateSaleDto) {
    const product = await this.prisma.storeProduct.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.active) {
      throw new BadRequestException('El producto está inactivo');
    }

    if (product.stock < dto.quantity) {
      throw new BadRequestException('No hay suficiente stock');
    }

    const unitPrice = Number(product.salePrice || 0);
    const unitCost = Number(product.costPrice || 0);
    const total = unitPrice * dto.quantity;
    const profit = (unitPrice - unitCost) * dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.storeSale.create({
        data: {
          productId: product.id,
          quantity: dto.quantity,
          unitPrice,
          unitCost,
          total,
          profit,
        },
        include: {
          product: true,
        },
      });

      await tx.storeProduct.update({
        where: { id: product.id },
        data: {
          stock: {
            decrement: dto.quantity,
          },
        },
      });

      await tx.payment.create({
        data: {
          concept: 'TIENDA',
          amount: total,
          notes: `Venta tienda: ${product.name} x${dto.quantity}`,
        },
      });

      return sale;
    });
  }

  async checkout(dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    return this.prisma.$transaction(async (tx) => {
      const createdSales: any[] = [];
      let grandTotal = 0;
      let grandProfit = 0;

      for (const item of dto.items) {
        const product = await tx.storeProduct.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException('Producto no encontrado');
        }

        if (!product.active) {
          throw new BadRequestException(`Producto inactivo: ${product.name}`);
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(`Stock insuficiente para ${product.name}`);
        }

        const unitPrice = Number(product.salePrice || 0);
        const unitCost = Number(product.costPrice || 0);
        const total = unitPrice * item.quantity;
        const profit = (unitPrice - unitCost) * item.quantity;

        const sale = await tx.storeSale.create({
          data: {
            productId: product.id,
            quantity: item.quantity,
            unitPrice,
            unitCost,
            total,
            profit,
          },
          include: {
            product: true,
          },
        });

        await tx.storeProduct.update({
          where: { id: product.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        createdSales.push(sale);
        grandTotal += total;
        grandProfit += profit;
      }

      await tx.payment.create({
        data: {
          concept: 'TIENDA',
          amount: grandTotal,
          notes: `Venta tienda: ${createdSales.length} productos`,
        },
      });

      return {
        total: grandTotal,
        profit: grandProfit,
        items: createdSales,
      };
    });
  }

  findSales() {
    return this.prisma.storeSale.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        product: true,
      },
    });
  }

  async dashboard() {
    const products = await this.prisma.storeProduct.findMany({
      include: {
        sales: true,
      },
    });

    const sales = await this.prisma.storeSale.findMany({
      include: {
        product: true,
      },
    });

    const totalSales = sales.reduce((sum, sale) => {
      return sum + Number(sale.total || 0);
    }, 0);

    const totalProfit = sales.reduce((sum, sale) => {
      return sum + Number(sale.profit || 0);
    }, 0);

    const soldUnits = sales.reduce((sum, sale) => {
      return sum + Number(sale.quantity || 0);
    }, 0);

    const lowStockProducts = products.filter((product) => {
      return product.stock <= 3;
    });

    const topProducts = products
      .map((product) => {
        const quantity = product.sales.reduce((sum, sale) => {
          return sum + Number(sale.quantity || 0);
        }, 0);

        const amount = product.sales.reduce((sum, sale) => {
          return sum + Number(sale.total || 0);
        }, 0);

        return {
          id: product.id,
          name: product.name,
          quantity,
          amount,
          stock: product.stock,
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    return {
      totalSales,
      totalProfit,
      soldUnits,
      productsCount: products.length,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      topProducts,
      recentSales: sales.slice(0, 10),
    };
  }
}
