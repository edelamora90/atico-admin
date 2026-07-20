import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AcademicArea,
  CreditTransactionType,
  MembershipStatus,
  PaymentConcept,
  PosSaleItemType,
  PosSaleStatus,
  PosSaleType,
  Prisma,
  Student,
  ClassType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { StudentContinuityService } from '../student-continuity/student-continuity.service';
import { toAuditJson } from '../utils/audit-log.util';
import {
  CancelPosSaleDto,
} from './dto/cancel-pos-sale.dto';
import {
  CheckoutPosDto,
  CheckoutPosItemDto,
  PosCheckoutItemType,
} from './dto/checkout-pos.dto';

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    private studentContinuityService: StudentContinuityService,
  ) {}

  async checkout(dto: CheckoutPosDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    this.validateItems(dto.items);

    const hasStore = dto.items.some((item) => item.type === PosCheckoutItemType.STORE);
    const hasAcademic = dto.items.some((item) => {
      return item.type === PosCheckoutItemType.ACADEMIC
        || item.type === PosCheckoutItemType.INSCRIPTION
        || item.type === PosCheckoutItemType.RENEWAL
        || item.type === PosCheckoutItemType.RENTAL
        || item.type === PosCheckoutItemType.COURSE_EVENT;
    });
    const requiresStudent = dto.items.some((item) => {
      return item.type === PosCheckoutItemType.ACADEMIC
        || item.type === PosCheckoutItemType.INSCRIPTION
        || item.type === PosCheckoutItemType.RENEWAL;
    });
    const saleType = this.getSaleType(hasStore, hasAcademic);

    if (requiresStudent && !dto.studentId) {
      throw new BadRequestException(
        'Selecciona un alumno para vender productos académicos.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let student: Student | null = null;
      const payments: any[] = [];
      const memberships: any[] = [];
      const storeSales: any[] = [];
      const ticketItems: any[] = [];
      let total = 0;

      if (dto.studentId) {
        student = await tx.student.findUnique({
          where: { id: dto.studentId },
        });

        if (!student) {
          throw new NotFoundException('Alumno no encontrado');
        }
      }

      // Duplicates the existing StudentsService/MembershipsService/StoreService
      // write logic inside this transaction so mixed POS sales are atomic.
      for (const item of dto.items) {
        if (item.type === PosCheckoutItemType.INSCRIPTION) {
          const result = await this.processInscription(tx, student);
          student = result.student;
          payments.push(result.payment);
          total += Number(result.payment.amount || 0);
          ticketItems.push({
            type: PosSaleItemType.INSCRIPTION,
            name: 'Inscripción',
            quantity: 1,
            unitPrice: Number(result.payment.amount || 0),
            total: Number(result.payment.amount || 0),
            paymentId: result.payment.id,
          });
        }

        if (item.type === PosCheckoutItemType.RENEWAL) {
          const result = await this.processRenewal(tx, student);
          student = result.student;
          payments.push(result.payment);
          total += Number(result.payment.amount || 0);
          ticketItems.push({
            type: PosSaleItemType.RENEWAL,
            name: 'Renovación',
            quantity: 1,
            unitPrice: Number(result.payment.amount || 0),
            total: Number(result.payment.amount || 0),
            paymentId: result.payment.id,
          });
        }

        if (item.type === PosCheckoutItemType.ACADEMIC) {
          const result = await this.processAcademic(tx, student, item.packageId!);
          student = result.student;
          memberships.push(result.membership);
          payments.push(...result.payments);
          total += Number(result.package.price || 0);
          ticketItems.push({
            type: PosSaleItemType.ACADEMIC,
            packageId: result.package.id,
            membershipId: result.membership?.id,
            paymentId: result.payments[0]?.id,
            name: result.package.name,
            quantity: 1,
            unitPrice: Number(result.package.price || 0),
            total: Number(result.package.price || 0),
          });
        }

        if (item.type === PosCheckoutItemType.STORE) {
          const result = await this.processStoreItem(tx, item);
          storeSales.push(result.sale);
          total += result.total;
          ticketItems.push({
            type: PosSaleItemType.STORE,
            productId: result.product.id,
            storeSaleId: result.sale.id,
            name: result.product.name,
            quantity: item.quantity,
            unitPrice: result.unitPrice,
            total: result.total,
          });
        }

        if (item.type === PosCheckoutItemType.RENTAL) {
          const result = await this.processRental(tx, item.rentalId!);
          payments.push(result.payment);
          total += Number(result.payment.amount || 0);
          ticketItems.push({
            type: PosSaleItemType.RENTAL,
            rentalId: result.rental.id,
            paymentId: result.payment.id,
            name: result.rental.title,
            quantity: 1,
            unitPrice: Number(result.payment.amount || 0),
            total: Number(result.payment.amount || 0),
          });
        }

        if (item.type === PosCheckoutItemType.COURSE_EVENT) {
          const result = await this.processCourseEvent(tx, item.courseEventId!, student, item);
          payments.push(result.payment);
          total += Number(result.total || 0);
          ticketItems.push({
            type: PosSaleItemType.COURSE_EVENT,
            courseEventId: result.item.id,
            paymentId: result.payment.id,
            name: result.item.title,
            quantity: result.quantity,
            unitPrice: result.unitPrice,
            total: result.total,
            participantName: result.participantName,
            participantPhone: result.participantPhone,
            participantEmail: result.participantEmail,
            ticketQuantity: result.quantity,
            teacherCommissionAmount: result.teacherCommissionAmount,
            teacherCommissionPercentage: result.teacherCommissionPercentage,
          });
        }
      }

      if (storeSales.length > 0) {
        const storeTotal = storeSales.reduce((sum, sale) => {
          return sum + Number(sale.total || 0);
        }, 0);

        const storePayment = await tx.payment.create({
          data: {
            concept: PaymentConcept.TIENDA,
            amount: storeTotal,
            notes: `Venta POS tienda: ${storeSales.length} producto(s)`,
          },
        });

        payments.push(storePayment);

        ticketItems.forEach((item) => {
          if (item.type === PosSaleItemType.STORE) {
            item.paymentId = storePayment.id;
          }
        });
      }

      const finalStudent = dto.studentId
        ? await tx.student.findUnique({
            where: { id: dto.studentId },
          })
        : null;

      const saleFolio = await this.generateSaleFolio(tx);
      let activityTicketIndex = 0;

      const sale = await tx.posSale.create({
        data: {
          folio: saleFolio,
          saleType,
          studentId: finalStudent?.id || null,
          total,
          items: {
            create: ticketItems.map((item) => ({
              type: item.type,
              name: item.name,
              quantity: Number(item.quantity || 1),
              unitPrice: Number(item.unitPrice || 0),
              total: Number(item.total || 0),
              packageId: item.packageId || null,
              productId: item.productId || null,
              rentalId: item.rentalId || null,
              courseEventId: item.courseEventId || null,
              membershipId: item.membershipId || null,
              storeSaleId: item.storeSaleId || null,
              paymentId: item.paymentId || null,
              ticketFolio: item.type === PosSaleItemType.COURSE_EVENT
                ? `${saleFolio}-${String(++activityTicketIndex).padStart(2, '0')}`
                : null,
              participantName: item.participantName || null,
              participantPhone: item.participantPhone || null,
              participantEmail: item.participantEmail || null,
              ticketQuantity: item.ticketQuantity || null,
              teacherCommissionAmount: item.teacherCommissionAmount ?? null,
              teacherCommissionPercentage: item.teacherCommissionPercentage ?? null,
            })),
          },
        },
        include: this.saleInclude(),
      });

      return {
        success: true,
        sale,
        saleType,
        student: finalStudent,
        items: sale.items,
        payments,
        memberships,
        storeSales,
        total,
        message: 'Venta registrada correctamente.',
      };
    });
  }

  async findSales(query: {
    date?: string;
    from?: string;
    to?: string;
    saleType?: PosSaleType;
  }) {
    const { createdAt } = this.getDateRange(query);

    return this.prisma.posSale.findMany({
      where: {
        createdAt,
        saleType: query.saleType || undefined,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.saleInclude(),
    });
  }

  async findSale(id: string) {
    const sale = await this.prisma.posSale.findUnique({
      where: { id },
      include: this.saleInclude(),
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }

  async cancelSale(id: string, dto: CancelPosSaleDto, cancelledById?: string) {
    const reason = dto.reason?.trim();

    if (!reason) {
      throw new BadRequestException('Captura el motivo de cancelación.');
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.posSale.findUnique({
        where: { id },
        include: this.saleInclude(),
      });

      if (!sale) {
        throw new NotFoundException('Venta no encontrada');
      }

      if (sale.status === PosSaleStatus.CANCELLED) {
        throw new BadRequestException('La venta ya está cancelada.');
      }

      await this.validateSaleCanBeCancelled(tx, sale);

      for (const item of sale.items) {
        if (item.type === PosSaleItemType.STORE && item.productId) {
          await tx.storeProduct.update({
            where: { id: item.productId },
            data: {
              stock: {
                increment: Number(item.quantity || 0),
              },
            },
          });
        }

        if (item.type === PosSaleItemType.ACADEMIC && item.membershipId) {
          const membership = item.membership;
          await tx.creditTransaction.create({
            data: {
              membershipId: item.membershipId,
              type: CreditTransactionType.CANCELLATION,
              amount: Number(membership?.initialCredits || 0) * -1,
              description: `Cancelación de venta POS ${sale.folio || sale.id}: ${reason}`,
            },
          });

          await tx.membership.update({
            where: { id: item.membershipId },
            data: {
              status: MembershipStatus.CANCELLED,
              availableCredits: 0,
              cancelledAt: new Date(),
              cancellationReason: reason,
              depletedAt: null,
            },
          });
        }
      }

      const cancelledSale = await tx.posSale.update({
        where: { id: sale.id },
        data: {
          status: PosSaleStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelReason: reason,
          cancelledById: cancelledById || null,
        },
        include: this.saleInclude(),
      });

      await tx.auditLog.create({
        data: {
          action: 'POS_SALE_CANCEL',
          entityType: 'PosSale',
          entityId: sale.id,
          actorId: cancelledById || null,
          reason,
          before: toAuditJson(sale),
          after: toAuditJson(cancelledSale),
        },
      });

      return {
        success: true,
        sale: cancelledSale,
        message: 'Venta cancelada correctamente.',
      };
    });
  }

  private async validateSaleCanBeCancelled(
    tx: Prisma.TransactionClient,
    sale: any,
  ) {
    for (const item of sale.items) {
      if (item.type === PosSaleItemType.ACADEMIC && item.membershipId) {
        const membership = await tx.membership.findUnique({
          where: { id: item.membershipId },
        });

        if (!membership) {
          continue;
        }

        if (
          membership.status !== MembershipStatus.ACTIVE ||
          Number(membership.availableCredits || 0) !== Number(membership.initialCredits || 0)
        ) {
          throw new BadRequestException(
            'No se puede cancelar porque el paquete ya tiene créditos usados.',
          );
        }
      }

      if (item.type === PosSaleItemType.COURSE_EVENT && item.courseEventId && sale.studentId) {
        const attendanceCount = await tx.attendance.count({
          where: {
            studentId: sale.studentId,
            session: {
              classTemplateId: item.courseEventId,
            },
          },
        });

        if (attendanceCount > 0) {
          throw new BadRequestException(
            'No se puede cancelar porque ya existe asistencia registrada.',
          );
        }
      }
    }
  }

  async getCashCut(query: {
    date?: string;
    from?: string;
    to?: string;
  }) {
    const range = this.getDateRange(query);
    const sales = await this.prisma.posSale.findMany({
      where: {
        createdAt: range.createdAt,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: this.saleInclude(),
    });

    const totals = sales.reduce((acc, sale) => {
      if (sale.status === PosSaleStatus.CANCELLED) {
        acc.cancelledSalesCount += 1;
        acc.cancelledAmount += Number(sale.total || 0);
        return acc;
      }

      acc.totalAmount += Number(sale.total || 0);

      if (sale.saleType === PosSaleType.STORE) {
        acc.salesByType.STORE.count += 1;
        acc.salesByType.STORE.amount += Number(sale.total || 0);
      }

      if (sale.saleType === PosSaleType.ACADEMIC) {
        acc.salesByType.ACADEMIC.count += 1;
        acc.salesByType.ACADEMIC.amount += Number(sale.total || 0);
      }

      if (sale.saleType === PosSaleType.MIXED) {
        acc.salesByType.MIXED.count += 1;
        acc.salesByType.MIXED.amount += Number(sale.total || 0);
        acc.mixedAmount += Number(sale.total || 0);
      }

      for (const item of sale.items) {
        if (item.type === PosSaleItemType.STORE) {
          acc.storeAmount += Number(item.total || 0);
        }

        if (item.type === PosSaleItemType.ACADEMIC) {
          acc.packageIncome += Number(item.total || 0);
        }

        if (item.type === PosSaleItemType.INSCRIPTION) {
          acc.inscriptionIncome += Number(item.total || 0);
        }

        if (item.type === PosSaleItemType.RENEWAL) {
          acc.renewalIncome += Number(item.total || 0);
        }
      }

      acc.storeIncome = acc.storeAmount;
      acc.academicIncome = acc.packageIncome + acc.inscriptionIncome + acc.renewalIncome;
      acc.totalIncome = acc.totalAmount;

      return acc;
    }, {
      totalAmount: 0,
      storeAmount: 0,
      academicAmount: 0,
      inscriptionAmount: 0,
      renewalAmount: 0,
      storeIncome: 0,
      academicIncome: 0,
      packageIncome: 0,
      inscriptionIncome: 0,
      renewalIncome: 0,
      totalIncome: 0,
      mixedAmount: 0,
      cancelledSalesCount: 0,
      cancelledAmount: 0,
      salesByType: {
        STORE: { saleType: PosSaleType.STORE, count: 0, amount: 0 },
        ACADEMIC: { saleType: PosSaleType.ACADEMIC, count: 0, amount: 0 },
        MIXED: { saleType: PosSaleType.MIXED, count: 0, amount: 0 },
      },
    });

    return {
      from: range.from.toISOString(),
      to: range.to?.toISOString(),
      totalSales: sales.length - totals.cancelledSalesCount,
      grossSalesCount: sales.length,
      cancelledSalesCount: totals.cancelledSalesCount,
      cancelledAmount: totals.cancelledAmount,
      totalAmount: totals.totalAmount,
      totalIncome: totals.totalIncome,
      storeAmount: totals.storeAmount,
      storeIncome: totals.storeIncome,
      academicAmount: totals.packageIncome,
      academicIncome: totals.academicIncome,
      packageIncome: totals.packageIncome,
      inscriptionAmount: totals.inscriptionIncome,
      inscriptionIncome: totals.inscriptionIncome,
      renewalAmount: totals.renewalIncome,
      renewalIncome: totals.renewalIncome,
      mixedAmount: totals.mixedAmount,
      salesByType: Object.values(totals.salesByType),
      sales,
    };
  }


  async createCashClose(dto: {
    date?: string;
    from?: string;
    to?: string;
    countedAmount: number;
    notes?: string;
    closedByName?: string;
    reviewedByName?: string;
  }) {
    if (dto.countedAmount === undefined || dto.countedAmount === null || Number.isNaN(Number(dto.countedAmount))) {
      throw new BadRequestException('Debes capturar el efectivo contado.');
    }

    const range = this.getDateRange(dto);
    const to = range.to || new Date();

    const expected = await this.prisma.posSale.aggregate({
      where: {
        createdAt: range.createdAt,
        status: PosSaleStatus.COMPLETED,
      },
      _sum: {
        total: true,
      },
    });

    const expectedAmount = Number(expected._sum.total || 0);
    const countedAmount = Number(dto.countedAmount || 0);
    const difference = countedAmount - expectedAmount;

    return this.prisma.cashRegisterClose.create({
      data: {
        date: range.from,
        from: range.from,
        to,
        expectedAmount,
        countedAmount,
        difference,
        notes: dto.notes || null,
        closedByName: dto.closedByName || null,
        reviewedByName: dto.reviewedByName || null,
      },
    });
  }

  async findCashCloses(query: {
    date?: string;
    from?: string;
    to?: string;
  }) {
    const range = this.getDateRange(query);

    return this.prisma.cashRegisterClose.findMany({
      where: {
        createdAt: range.createdAt,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async generateSaleFolio(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const existingSalesToday = await tx.posSale.count({
      where: {
        createdAt: {
          gte: start,
          lt: end,
        },
      },
    });

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const sequence = String(existingSalesToday + 1).padStart(4, '0');

    return `ATC-${year}${month}${day}-${sequence}`;
  }


  private validateItems(items: CheckoutPosItemDto[]) {
    items.forEach((item) => {
      if (item.type === PosCheckoutItemType.ACADEMIC && !item.packageId) {
        throw new BadRequestException('Los productos académicos requieren packageId.');
      }

      if (item.type === PosCheckoutItemType.STORE) {
        if (!item.productId) {
          throw new BadRequestException('Los productos de tienda requieren productId.');
        }

        if (!item.quantity || item.quantity < 1) {
          throw new BadRequestException('Los productos de tienda requieren quantity mayor a 0.');
        }
      }

      if (item.type === PosCheckoutItemType.RENTAL && !item.rentalId) {
        throw new BadRequestException('Las rentas requieren rentalId.');
      }

      if (item.type === PosCheckoutItemType.COURSE_EVENT && !item.courseEventId) {
        throw new BadRequestException('Cursos, talleres y eventos requieren courseEventId.');
      }

      if (
        item.type === PosCheckoutItemType.COURSE_EVENT &&
        item.quantity !== undefined &&
        item.quantity < 1
      ) {
        throw new BadRequestException('Cursos, talleres y eventos requieren quantity mayor a 0.');
      }
    });
  }

  private getSaleType(hasStore: boolean, hasAcademic: boolean): PosSaleType {
    if (hasStore && hasAcademic) return PosSaleType.MIXED;
    if (hasStore) return PosSaleType.STORE;
    return PosSaleType.ACADEMIC;
  }

  private saleInclude() {
    return {
      student: true,
      items: {
        orderBy: {
          createdAt: 'asc' as const,
        },
        include: {
          package: true,
          product: true,
          membership: {
            include: {
              package: true,
              transactions: true,
            },
          },
          storeSale: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
      },
    };
  }

  private getDateRange(query: {
    date?: string;
    from?: string;
    to?: string;
  }) {
    if (query.from || query.to) {
      const from = query.from ? new Date(query.from) : new Date(0);
      const to = query.to ? new Date(query.to) : undefined;

      return {
        from,
        to,
        createdAt: {
          ...(query.from ? { gte: from } : {}),
          ...(to ? { lte: to } : {}),
        },
      };
    }

    const date = query.date ? new Date(`${query.date}T00:00:00`) : new Date();
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);

    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    return {
      from,
      to,
      createdAt: {
        gte: from,
        lt: to,
      },
    };
  }

  private getBaseInscriptionAmount(area?: AcademicArea) {
    if (area === AcademicArea.MUSIC) {
      return 250;
    }

    if (area === AcademicArea.BOTH) {
      return 450;
    }

    return 200;
  }

  private getAreaLabel(area?: AcademicArea | null): string {
    return area === AcademicArea.MUSIC ? 'Música' : 'Danza';
  }

  private async processInscription(
    tx: Prisma.TransactionClient,
    student: Student | null,
  ) {
    if (!student) {
      throw new BadRequestException(
        'Selecciona un alumno para vender productos académicos.',
      );
    }

    if (student.inscriptionPaid) {
      throw new BadRequestException('La inscripción ya fue pagada.');
    }

    const area = student.academicArea || AcademicArea.DANCE;
    const baseAmount = this.getBaseInscriptionAmount(area);
    const trialAmount = Number(student.trialClassAmount || 0);
    const finalAmount = Math.max(baseAmount - trialAmount, 0);

    const enrollmentExpiresAt = new Date();
    enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + 30);

    const payment = await tx.payment.create({
      data: {
        studentId: student.id,
        concept: PaymentConcept.INSCRIPCION,
        amount: finalAmount,
        notes: `Pago de inscripción. Área: ${area}. Base: $${baseAmount}. Descuento clase muestra: $${trialAmount}.`,
      },
    });

    const updatedStudent = await tx.student.update({
      where: { id: student.id },
      data: {
        inscriptionAmount: finalAmount,
        inscriptionPaid: true,
        enrolled: true,
        enrollmentExpiresAt,
      },
    });

    return {
      payment,
      student: updatedStudent,
    };
  }

  private async processRenewal(
    tx: Prisma.TransactionClient,
    student: Student | null,
  ) {
    if (!student) {
      throw new BadRequestException(
        'Selecciona un alumno para vender productos académicos.',
      );
    }

    const continuity =
      await this.studentContinuityService.getStudentContinuity(student.id, tx);

    if (continuity?.requiresInitialInscription) {
      throw new BadRequestException(
        'Este alumno necesita inscripción inicial, no renovación.',
      );
    }

    if (!continuity?.requiresRenewal) {
      throw new BadRequestException('Este alumno no requiere renovación.');
    }

    const enrollmentExpiresAt = new Date();
    enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + 30);

    const payment = await tx.payment.create({
      data: {
        studentId: student.id,
        concept: PaymentConcept.RENEWAL,
        amount: continuity.renewalFeeAmount,
        notes: `Pago de renovación de continuidad. ${continuity.reason}`,
      },
    });

    const updatedStudent = await tx.student.update({
      where: { id: student.id },
      data: {
        enrolled: true,
        enrollmentExpiresAt,
      },
    });

    return {
      payment,
      student: updatedStudent,
    };
  }

  private async processAcademic(
    tx: Prisma.TransactionClient,
    student: Student | null,
    packageId: string,
  ) {
    if (!student) {
      throw new BadRequestException(
        'Selecciona un alumno para vender productos académicos.',
      );
    }

    const selectedPackage = await tx.package.findUnique({
      where: { id: packageId },
    });

    if (!selectedPackage) {
      throw new NotFoundException('Paquete no encontrado');
    }

    if (!selectedPackage.active || selectedPackage.deletedAt) {
      throw new BadRequestException('El paquete está inactivo.');
    }

    if (selectedPackage.area === AcademicArea.BOTH) {
      throw new BadRequestException('Solo se permiten paquetes de Danza o Música.');
    }

    const continuity =
      await this.studentContinuityService.getStudentContinuity(student.id, tx);

    if (
      selectedPackage.requiresEnrollment &&
      !selectedPackage.includesFreeInscription &&
      continuity?.requiresInitialInscription
    ) {
      throw new BadRequestException(
        'Este paquete requiere que el alumno pague inscripción antes de comprarlo.',
      );
    }

    if (selectedPackage.isTrial && student.trialClassUsed) {
      throw new BadRequestException('El alumno ya utilizó su clase muestra.');
    }

    const wasEnrolledBeforeAcademicSale = student.enrolled;
    const startDate = new Date();
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 1);

    const enrollmentExpiresAt = new Date(expirationDate);
    enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + 30);

    const membership = await tx.membership.create({
      data: {
        studentId: student.id,
        packageId: selectedPackage.id,
        initialCredits: selectedPackage.credits,
        availableCredits: selectedPackage.credits,
        startDate,
        expirationDate,
        depletedAt: selectedPackage.credits <= 0 ? startDate : null,
      },
    });

    await tx.creditTransaction.create({
      data: {
        membershipId: membership.id,
        type: 'PURCHASE',
        amount: selectedPackage.credits,
        description: `Compra de paquete: ${selectedPackage.name}`,
      },
    });

    const packagePayment = await tx.payment.create({
      data: {
        studentId: student.id,
        concept: selectedPackage.isTrial
          ? PaymentConcept.DAY_PASS
          : PaymentConcept.PAQUETE,
        amount: selectedPackage.price,
        notes: selectedPackage.isTrial
          ? `Pago generado por clase muestra: ${selectedPackage.name}`
          : `Pago generado por compra de paquete: ${selectedPackage.name}`,
      },
    });

    const payments = [packagePayment];

    if (selectedPackage.isTrial) {
      student = await tx.student.update({
        where: { id: student.id },
        data: {
          trialClassUsed: true,
          trialClassPaid: Number(selectedPackage.price || 0) > 0,
          trialClassAmount: selectedPackage.price,
        },
      });
    }

    if (
      !selectedPackage.isTrial &&
      selectedPackage.type !== 'DAY_PASS'
    ) {
      student = await tx.student.update({
        where: { id: student.id },
        data: {
          enrolled: true,
          enrollmentExpiresAt,
        },
      });
    }

    if (
      selectedPackage.includesFreeInscription &&
      !wasEnrolledBeforeAcademicSale
    ) {
      const inscriptionPayment = await tx.payment.create({
        data: {
          studentId: student.id,
          concept: PaymentConcept.INSCRIPCION,
          amount: 0,
          notes: `Inscripción incluida gratis en promoción: ${selectedPackage.name}`,
        },
      });

      payments.push(inscriptionPayment);

      student = await tx.student.update({
        where: { id: student.id },
        data: {
          inscriptionPaid: true,
          inscriptionAmount: 0,
          enrolled: true,
          enrollmentExpiresAt,
        },
      });
    }

    const membershipWithRelations = await tx.membership.findUnique({
      where: { id: membership.id },
      include: {
        student: true,
        package: true,
        transactions: true,
      },
    });

    return {
      membership: membershipWithRelations,
      package: selectedPackage,
      payments,
      student,
    };
  }

  private async processStoreItem(
    tx: Prisma.TransactionClient,
    item: CheckoutPosItemDto,
  ) {
    const product = await tx.storeProduct.findUnique({
      where: { id: item.productId! },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.active || product.deletedAt) {
      throw new BadRequestException(`Producto inactivo: ${product.name}`);
    }

    if (product.stock < item.quantity!) {
      throw new BadRequestException(`Stock insuficiente para ${product.name}`);
    }

    const unitPrice = Number(product.salePrice || 0);
    const unitCost = Number(product.costPrice || 0);
    const total = unitPrice * item.quantity!;
    const profit = (unitPrice - unitCost) * item.quantity!;

    const sale = await tx.storeSale.create({
      data: {
        productId: product.id,
        quantity: item.quantity!,
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
          decrement: item.quantity!,
        },
      },
    });

    return {
      product,
      sale,
      unitPrice,
      total,
    };
  }

  private async processRental(
    tx: Prisma.TransactionClient,
    rentalId: string,
  ) {
    const rental = await tx.class.findUnique({
      where: { id: rentalId },
      include: {
        room: true,
      },
    });

    if (!rental || rental.type !== ClassType.RENTAL || rental.deletedAt) {
      throw new NotFoundException('Renta no encontrada');
    }

    const amount = Number(rental.teacherPaymentAmount || 0);

    if (amount <= 0) {
      throw new BadRequestException('La renta no tiene un monto válido para cobrar.');
    }

    const payment = await tx.payment.create({
      data: {
        concept: PaymentConcept.RENTA,
        amount,
        notes: `Pago de renta: ${rental.title}${rental.room?.name ? ` · ${rental.room.name}` : ''}`,
      },
    });

    return {
      rental,
      payment,
    };
  }

  private async processCourseEvent(
    tx: Prisma.TransactionClient,
    courseEventId: string,
    student: Student | null,
    checkoutItem: CheckoutPosItemDto,
  ) {
    const item = await tx.class.findUnique({
      where: { id: courseEventId },
    });

    if (
      !item ||
      item.deletedAt ||
      (
        item.type !== ClassType.COURSE &&
        item.type !== ClassType.WORKSHOP &&
        item.type !== ClassType.EVENT
      )
    ) {
      throw new NotFoundException('Curso, taller o evento no encontrado');
    }

    const quantity = item.type === ClassType.EVENT
      ? Math.max(1, Number(checkoutItem.quantity || 1))
      : 1;
    const unitPrice = Number(item.directEnrollmentCost || 0);
    const total = unitPrice * quantity;

    if (unitPrice <= 0) {
      throw new BadRequestException('Este curso, taller o evento no tiene un monto válido para cobrar.');
    }

    if ((item.type === ClassType.COURSE || item.type === ClassType.WORKSHOP) && !student) {
      throw new BadRequestException(
        'Selecciona un alumno para vender este curso o taller.',
      );
    }

    if (item.type === ClassType.EVENT && item.requiresEnrollment && !student) {
      throw new BadRequestException(
        'Este evento requiere alumno registrado con suscripción vigente.',
      );
    }

    if (item.requiresEnrollment && !student?.inscriptionPaid) {
      throw new BadRequestException(
        'Esta actividad requiere suscripción o inscripción general pagada.',
      );
    }

    const percentage = Number(item.teacherDirectPercentage || 0);
    const teacherCommissionAmount = this.roundMoney(total * percentage / 100);

    const payment = await tx.payment.create({
      data: {
        studentId: student?.id || null,
        concept: item.type === ClassType.EVENT
          ? PaymentConcept.EVENTO
          : PaymentConcept.CURSO,
        amount: total,
        notes: `Venta directa de ${item.type === ClassType.EVENT ? 'evento' : item.type === ClassType.WORKSHOP ? 'taller' : 'curso'}: ${item.title}`,
      },
    });

    return {
      item,
      payment,
      quantity,
      unitPrice,
      total,
      participantName: checkoutItem.participantName || null,
      participantPhone: checkoutItem.participantPhone || null,
      participantEmail: checkoutItem.participantEmail || null,
      teacherCommissionAmount,
      teacherCommissionPercentage: percentage,
    };
  }

  private roundMoney(value: number): number {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }
}
