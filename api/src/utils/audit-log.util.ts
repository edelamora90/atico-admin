import { Prisma } from '@prisma/client';

export function getActorId(user?: any): string | null {
  return user?.id || user?.sub || user?.userId || null;
}

export function toAuditJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function normalizeAuditReason(reason: unknown, fallback: string): string {
  const value = String(reason || '').trim();
  return value.length >= 3 ? value : fallback;
}
