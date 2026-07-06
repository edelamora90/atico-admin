export type AttendanceIdentitySource = 'SESSION';

export type AttendanceNormalizable = {
  sessionId?: string | null;
  studentId?: string | null;
  createdAt?: Date | string | null;
  session?: {
    id?: string | null;
    classTemplateId?: string | null;
    teacherId?: string | null;
    date?: Date | string | null;
  } | null;
  class?: {
    id?: string | null;
    teacherId?: string | null;
    startDate?: Date | string | null;
  } | null;
};

export type NormalizedAttendanceIdentity = {
  sessionId: string | null;
  studentId: string | null;
  teacherId: string | null;
  date: Date | null;
  isLegacy: boolean;
  source: AttendanceIdentitySource;
};

export function normalizeAttendanceIdentity(
  row: AttendanceNormalizable,
): NormalizedAttendanceIdentity {
  const sessionId = row.sessionId || row.session?.id || null;
  const teacherId = row.session?.teacherId || row.class?.teacherId || null;
  const date = toDate(row.session?.date || row.class?.startDate || row.createdAt);

  return {
    sessionId,
    studentId: row.studentId || null,
    teacherId,
    date,
    isLegacy: !sessionId,
    source: 'SESSION',
  };
}

export function getAttendanceIdentityKey(row: AttendanceNormalizable): string {
  const identity = normalizeAttendanceIdentity(row);
  const studentId = identity.studentId || 'unknown';

  if (!identity.sessionId) {
    throw new Error('sessionId is required for attendance identity keys.');
  }

  return `SESSION:${identity.sessionId}:${studentId}`;
}

function toDate(value?: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}
