import { Injectable } from '@nestjs/common';
import { AcademicArea, PaymentConcept, Prisma, StudentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StudentContinuityService } from '../student-continuity/student-continuity.service';
import { normalizeAuditReason, toAuditJson } from '../utils/audit-log.util';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  constructor(
    private prisma: PrismaService,
    private studentContinuityService: StudentContinuityService,
  ) {}

  private getBaseInscriptionAmount(area?: AcademicArea) {
    if (area === AcademicArea.MUSIC) {
      return 250;
    }

    if (area === AcademicArea.BOTH) {
      return 450;
    }

    return 200;
  }

  async create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: this.buildStudentCreateData(dto),
    });
  }

  async findAll() {
    const students = await this.prisma.student.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        memberships: {
          include: {
            package: true,
            transactions: true,
          },
        },
        payments: true,
        reservations: true,
      },
    });

    return Promise.all(students.map((student) => this.attachContinuity(student)));
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        memberships: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            package: true,
            transactions: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            posSaleItems: {
              include: {
                sale: true,
              },
            },
          },
        },
        reservations: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            session: {
              include: {
                class: {
                  include: {
                    course: true,
                    teacher: true,
                    room: true,
                  },
                },
              },
            },
          },
        },
        attendances: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            session: {
              include: {
                class: {
                  include: {
                    course: true,
                    teacher: true,
                    room: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) {
      return student;
    }

    const membershipById = new Map(
      student.memberships.map((membership) => [membership.id, membership]),
    );

    return this.attachContinuity({
      ...student,
      reservations: student.reservations.map((reservation) => ({
        ...reservation,
        creditMembership: reservation.creditMembershipId
          ? membershipById.get(reservation.creditMembershipId) || null
          : null,
      })),
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    return this.prisma.student.update({
      where: { id },
      data: this.buildStudentProfileData(dto),
    });
  }

  private buildStudentCreateData(dto: CreateStudentDto): Prisma.StudentCreateInput {
    return {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      bloodType: dto.bloodType,
      allergies: dto.allergies,
      medicalConditions: dto.medicalConditions,
      medications: dto.medications,
      injuries: dto.injuries,
      medicalNotes: dto.medicalNotes,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactRelationship: dto.emergencyContactRelationship,
      emergencyContactPhone: dto.emergencyContactPhone,
      emergencyContactPhone2: dto.emergencyContactPhone2,
      academicArea: dto.academicArea,
      photoConsent: dto.photoConsent,
      mediaConsent: dto.mediaConsent,
      rulesAccepted: dto.rulesAccepted,
    };
  }

  private buildStudentProfileData(dto: UpdateStudentDto): Prisma.StudentUpdateInput {
    return {
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      bloodType: dto.bloodType,
      allergies: dto.allergies,
      medicalConditions: dto.medicalConditions,
      medications: dto.medications,
      injuries: dto.injuries,
      medicalNotes: dto.medicalNotes,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactRelationship: dto.emergencyContactRelationship,
      emergencyContactPhone: dto.emergencyContactPhone,
      emergencyContactPhone2: dto.emergencyContactPhone2,
      academicArea: dto.academicArea,
      photoConsent: dto.photoConsent,
      mediaConsent: dto.mediaConsent,
      rulesAccepted: dto.rulesAccepted,
    };
  }

  async payInscription(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
    });

    if (!student) {
      throw new Error('Alumno no encontrado');
    }

    if (student.inscriptionPaid) {
      throw new Error('La inscripción ya fue pagada.');
    }

    const area = student.academicArea || AcademicArea.DANCE;
    const baseAmount = this.getBaseInscriptionAmount(area);
    const trialAmount = Number(student.trialClassAmount || 0);
    const finalAmount = Math.max(baseAmount - trialAmount, 0);

    const enrollmentExpiresAt = new Date();
    enrollmentExpiresAt.setDate(enrollmentExpiresAt.getDate() + 30);

    return this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          studentId: student.id,
          concept: PaymentConcept.INSCRIPCION,
          amount: finalAmount,
          notes: `Pago de inscripción. Área: ${area}. Base: $${baseAmount}. Descuento clase muestra: $${trialAmount}.`,
        },
      });

      return tx.student.update({
        where: { id: student.id },
        data: {
          inscriptionAmount: finalAmount,
          inscriptionPaid: true,
          enrolled: true,
          enrollmentExpiresAt,
        },
      });
    });
  }

  async remove(id: string, input: { reason?: string; actorId?: string | null } = {}) {
    const current = await this.prisma.student.findUnique({
      where: { id },
      include: {
        memberships: true,
        payments: true,
        reservations: true,
        attendances: true,
      },
    });

    if (!current) {
      return null;
    }

    const reason = normalizeAuditReason(
      input.reason,
      'Baja lógica de alumno desde administración.',
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({
        where: { id },
        data: {
          status: StudentStatus.INACTIVO,
          deletedAt: new Date(),
          deletionReason: reason,
          deletedById: input.actorId || null,
        },
        include: {
          memberships: true,
          payments: true,
          reservations: true,
          attendances: true,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'STUDENT_SOFT_DELETE',
          entityType: 'Student',
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

  private async attachContinuity<T extends { id: string }>(student: T) {
    const studentContinuity =
      await this.studentContinuityService.getStudentContinuity(student.id);

    return {
      ...student,
      studentContinuity,
    };
  }
}
