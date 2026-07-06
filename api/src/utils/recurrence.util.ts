type RecurrenceClassLike = {
  recurrenceType?: 'NONE' | 'WEEKLY' | 'CUSTOM' | string | null;
  daysOfWeek?: number[] | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  recurrenceStart?: Date | string | null;
  recurrenceEnd?: Date | string | null;
};

export function isClassActiveOnDate(
  selectedClass: RecurrenceClassLike,
  date: Date,
): boolean {
  const recurrenceType = selectedClass.recurrenceType || 'NONE';

  if (recurrenceType === 'NONE') {
    const startDate = toDate(selectedClass.startDate);
    return startDate ? isSameLocalDate(startDate, date) : true;
  }

  const recurrenceStart = toDate(selectedClass.recurrenceStart || selectedClass.startDate);
  const recurrenceEnd = toDate(selectedClass.recurrenceEnd || selectedClass.endDate);
  const dateStart = startOfLocalDay(date).getTime();

  if (recurrenceStart && dateStart < startOfLocalDay(recurrenceStart).getTime()) {
    return false;
  }

  if (recurrenceEnd && dateStart > startOfLocalDay(recurrenceEnd).getTime()) {
    return false;
  }

  const daysOfWeek = selectedClass.daysOfWeek || [];

  if (daysOfWeek.length === 0) {
    return true;
  }

  return daysOfWeek.includes(date.getDay());
}

export function calculateHours(startTime?: string | null, endTime?: string | null): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return 0;
  }

  return (endMinutes - startMinutes) / 60;
}

export function getSessionDates(
  start: Date,
  end: Date,
  daysOfWeek: number[],
): Date[] {
  if (end < start) {
    return [];
  }

  const allowedDays = new Set(daysOfWeek);
  const dates: Date[] = [];
  const cursor = startOfLocalDay(start);
  const lastDay = startOfLocalDay(end).getTime();

  while (cursor.getTime() <= lastDay) {
    if (allowedDays.size === 0 || allowedDays.has(cursor.getDay())) {
      dates.push(new Date(cursor));
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function parseTimeToMinutes(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function toDate(value?: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfLocalDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return startOfLocalDay(left).getTime() === startOfLocalDay(right).getTime();
}
