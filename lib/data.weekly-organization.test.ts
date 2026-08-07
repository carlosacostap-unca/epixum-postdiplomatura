import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@/types';

const mocks = vi.hoisted(() => ({
  records: {} as Record<string, unknown[]>,
}));

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { model: null },
    filter: () => 'course-filter',
    collection: (name: string) => ({ getFullList: vi.fn(async () => mocks.records[name] || []) }),
  })),
}));

import { getCourseOrganizationData } from './data';

describe('consulta de organización semanal', () => {
  beforeEach(() => {
    mocks.records = {
      course_weeks: [
        { id: 'week-2', course: 'course-1', number: 2, title: 'Semana 2', status: 'borrador' },
        { id: 'week-1', course: 'course-1', number: 1, title: 'Semana 1', status: 'publicada' },
      ],
      classes: [{ id: 'class-visible', week: 'week-1' }, { id: 'class-unassigned' }],
      assignments: [{ id: 'assignment-hidden', week: 'week-2' }],
      inquiries: [{ id: 'inquiry-visible', week: 'week-1', created: '2026-08-06' }],
    };
  });

  it('ordena semanas, agrupa contenido y separa la bandeja sin asignar', async () => {
    const course = { id: 'course-1', organizationMode: 'semanal' } as Course;
    const result = await getCourseOrganizationData(course, new Date('2026-08-06T12:00:00.000Z'));

    expect(result.weeks.map((week) => week.id)).toEqual(['week-1', 'week-2']);
    expect(result.groups[0].classes.map((item) => item.id)).toEqual(['class-visible']);
    expect(result.classes.map((item) => item.id)).toEqual(['class-visible']);
    expect(result.assignments).toEqual([]);
    expect(result.unassigned.classes.map((item) => item.id)).toEqual(['class-unassigned']);
  });

  it('mantiene todo el contenido en modalidad tradicional', async () => {
    const course = { id: 'course-1', organizationMode: 'tradicional' } as Course;
    const result = await getCourseOrganizationData(course);
    expect(result.classes).toHaveLength(2);
    expect(result.assignments).toHaveLength(1);
  });
});
