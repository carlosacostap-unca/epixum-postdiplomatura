import type { CourseContent } from '@/types';

export function normalizeCourseContentTitle(value: unknown) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title) throw new Error('El título del contenido es obligatorio');
  if (title.length > 160) throw new Error('El título del contenido no puede superar los 160 caracteres');
  return title;
}

export function sortCourseContents<T extends Pick<CourseContent, 'id' | 'position'>>(items: T[]) {
  return [...items].sort((left, right) =>
    (left.position ?? 0) - (right.position ?? 0) ||
    left.id.localeCompare(right.id));
}

export function isCompleteCourseContentOrder(currentIds: string[], requestedIds: string[]) {
  if (currentIds.length !== requestedIds.length || new Set(requestedIds).size !== requestedIds.length) return false;
  const current = new Set(currentIds);
  return requestedIds.every((id) => current.has(id));
}
