import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';

import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const identifier = this.normalizeIdentifier(
      dto.username || dto.identifier || dto.email,
    );

    if (!identifier) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const admin = await this.prisma.administrator.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const validPassword = await bcrypt.compare(dto.password, admin.password);

    if (!validPassword) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }

    const user = this.toSafeUser(admin);

    const token = this.jwtService.sign(user, {
      secret: process.env.JWT_SECRET || 'atico-dev-secret',
      expiresIn: '12h',
    });

    return {
      accessToken: token,
      user,
    };
  }

  async me(user: any) {
    const administrator = await this.prisma.administrator.findUnique({
      where: { id: user.id },
    });

    if (!administrator) {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }

    return {
      user: this.toSafeUser(administrator),
    };
  }

  async updateMe(user: any, dto: UpdateMeDto) {
    const data: {
      name?: string;
      username?: string;
      password?: string;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.username !== undefined) {
      data.username = this.normalizeUsername(dto.username);
    }

    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      const administrator = await this.prisma.administrator.update({
        where: { id: user.id },
        data,
      });

      return {
        user: this.toSafeUser(administrator),
      };
    } catch (error: any) {
      this.handleUniqueError(error);
      throw error;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const identifier = this.normalizeIdentifier(dto.identifier);
    const administrator = await this.prisma.administrator.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
      },
    });

    if (administrator?.email) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.prisma.administrator.update({
        where: { id: administrator.id },
        data: {
          passwordResetTokenHash: this.hashResetToken(token),
          passwordResetTokenExpiresAt: expiresAt,
        },
      });

      await this.sendResetPasswordEmail(administrator.email, token);
    }

    return {
      message:
        'Si existe una cuenta con esos datos, enviaremos instrucciones al correo registrado.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(dto.token);
    const administrator = await this.prisma.administrator.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetTokenExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!administrator) {
      throw new BadRequestException('El enlace de recuperación no es válido o expiró.');
    }

    await this.prisma.administrator.update({
      where: { id: administrator.id },
      data: {
        password: await bcrypt.hash(dto.password, 10),
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return {
      message: 'Contraseña actualizada correctamente.',
    };
  }

  private normalizeIdentifier(value?: string | null): string {
    return value?.toLowerCase().trim() || '';
  }

  private normalizeUsername(value: string): string {
    return value.toLowerCase().trim();
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendResetPasswordEmail(email: string, token: string) {
    const appUrl = process.env.WEB_URL || 'http://localhost:4200';
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    if (!process.env.SMTP_HOST) {
      console.warn(
        `SMTP no configurado. Enlace de recuperación para ${email}: ${resetUrl}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'El Ático <no-reply@atico.local>',
      to: email,
      subject: 'Recupera tu contraseña de El Ático',
      text: `Usa este enlace para cambiar tu contraseña: ${resetUrl}`,
      html: `
        <p>Recibimos una solicitud para cambiar tu contraseña de El Ático.</p>
        <p><a href="${resetUrl}">Cambiar contraseña</a></p>
        <p>Este enlace vence en 1 hora.</p>
      `,
    });
  }

  private handleUniqueError(error: any): void {
    if (error?.code !== 'P2002') {
      return;
    }

    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(',')
      : String(error.meta?.target || '');

    if (target.includes('username')) {
      throw new BadRequestException(
        'Ya existe un usuario con este nombre de usuario.',
      );
    }

    throw new BadRequestException('Ya existe un usuario con este correo.');
  }

  private toSafeUser(admin: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    role: any;
  }) {
    return {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    };
  }
}
