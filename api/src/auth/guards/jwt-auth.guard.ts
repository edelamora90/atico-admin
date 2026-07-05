import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwtService = new JwtService();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Sesión requerida.');
    }

    const token = header.replace('Bearer ', '').trim();

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'atico-dev-secret',
      });

      request.user = payload;

      return true;
    } catch {
      throw new UnauthorizedException('Sesión inválida o expirada.');
    }
  }
}
