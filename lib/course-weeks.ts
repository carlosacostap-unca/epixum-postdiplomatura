import type { Course, CourseWeek, CourseWeekStatus } from '@/types';

export interface CourseWeekInput {
  number: number | string;
  title: string;
  startDate?: string;
  endDate?: string;
  status: CourseWeekStatus;
  publishAt?: string;
}

export type CourseWeekValidation =
  | { valid: true; data: { number: number; title: string; startDate: string | null; endDate: string | null; status: CourseWeekStatus; publishAt: string | null } }
  | { valid: false; errors: Record<string, string> };

function validDate(value?: string) {
  if (!value) return true;
  return !Number.isNaN(new Date(value).getTime());
}

export function courseUsesWeeks(course: Pick<Course, 'organizationMode'>) {
  return course.organizationMode === 'semanal';
}

export function isWeekEffectivelyVisible(week: Pick<CourseWeek, 'status' | 'publishAt'>, now = new Date()) {
  if (week.status === 'publicada') return true;
  if (week.status !== 'programada' || !week.publishAt) return false;
  const publishAt = new Date(week.publishAt);
  return !Number.isNaN(publishAt.getTime()) && publishAt.getTime() <= now.getTime();
}

export function validateCourseWeekInput(
  input: CourseWeekInput,
  existingWeeks: Array<Pick<CourseWeek, 'id' | 'number'>> = [],
  currentWeekId?: string,
): CourseWeekValidation {
  const errors: Record<string, string> = {};
  const hasNumber = typeof input.number === 'number' || input.number.trim() !== '';
  const number = Number(input.number);
  const title = input.title.trim();
  if (!hasNumber || !Number.isInteger(number) || number < 0) errors.number = 'Ingresá un número entero igual o mayor que cero.';
  if (!title) errors.title = 'Ingresá un título para la semana.';
  if (existingWeeks.some((week) => week.id !== currentWeekId && week.number === number)) {
    errors.number = 'Ya existe una semana con ese número en el curso.';
  }
  if (!validDate(input.startDate)) errors.startDate = 'La fecha de inicio no es válida.';
  if (!validDate(input.endDate)) errors.endDate = 'La fecha de finalización no es válida.';
  if (input.startDate && input.endDate && validDate(input.startDate) && validDate(input.endDate) && new Date(input.endDate) < new Date(input.startDate)) {
    errors.endDate = 'La fecha de finalización debe ser posterior al inicio.';
  }
  if (!['borrador', 'publicada', 'programada'].includes(input.status)) errors.status = 'Seleccioná un estado válido.';
  if (input.status === 'programada' && (!input.publishAt || !validDate(input.publishAt))) {
    errors.publishAt = 'Indicá una fecha y hora de publicación válida.';
  }
  if (Object.keys(errors).length > 0) return { valid: false, errors };
  return {
    valid: true,
    data: {
      number,
      title,
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      status: input.status,
      publishAt: input.status === 'programada' ? input.publishAt || null : null,
    },
  };
}

export function teacherCanManageWeeks(
  course: Pick<Course, 'teachers' | 'organizationMode'>,
  user: { id: string; role?: string },
) {
  return courseUsesWeeks(course) && user.role === 'docente' && Boolean(course.teachers?.includes(user.id));
}

export function weekBelongsToCourse(week: Pick<CourseWeek, 'course'>, courseId: string) {
  return week.course === courseId;
}

export function visibleWeekIds(weeks: CourseWeek[], now = new Date()) {
  return new Set(weeks.filter((week) => isWeekEffectivelyVisible(week, now)).map((week) => week.id));
}

export function filterContentForCourseMode<T extends { week?: string }>(
  course: Pick<Course, 'organizationMode'>,
  weeks: CourseWeek[],
  records: T[],
  now = new Date(),
) {
  if (!courseUsesWeeks(course)) return records;
  const allowed = visibleWeekIds(weeks, now);
  return records.filter((record) => Boolean(record.week && allowed.has(record.week)));
}

export function groupContentByWeek<T extends { week?: string }>(weeks: CourseWeek[], records: T[]) {
  const grouped = new Map(weeks.map((week) => [week.id, [] as T[]]));
  for (const record of records) {
    if (record.week && grouped.has(record.week)) grouped.get(record.week)?.push(record);
  }
  return grouped;
}

export function unassignedContent<T extends { week?: string }>(records: T[]) {
  return records.filter((record) => !record.week);
}
