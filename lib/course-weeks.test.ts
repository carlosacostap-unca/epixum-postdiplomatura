import { describe, expect, it } from 'vitest';
import type { Course, CourseWeek } from '@/types';
import {
  courseUsesWeeks,
  filterContentForCourseMode,
  isWeekEffectivelyVisible,
  teacherCanManageWeeks,
  unassignedContent,
  validateCourseWeekInput,
  weekBelongsToCourse,
} from './course-weeks';

const now = new Date('2026-08-06T12:00:00.000Z');

function week(overrides: Partial<CourseWeek>): CourseWeek {
  return { id: 'week-1', course: 'course-1', number: 1, title: 'Semana 1', status: 'borrador', ...overrides } as CourseWeek;
}

describe('organización semanal', () => {
  it('calcula visibilidad publicada y programada sin cambiar el estado', () => {
    expect(isWeekEffectivelyVisible(week({ status: 'borrador' }), now)).toBe(false);
    expect(isWeekEffectivelyVisible(week({ status: 'publicada' }), now)).toBe(true);
    expect(isWeekEffectivelyVisible(week({ status: 'programada', publishAt: '2026-08-06T11:59:00.000Z' }), now)).toBe(true);
    expect(isWeekEffectivelyVisible(week({ status: 'programada', publishAt: '2026-08-06T12:01:00.000Z' }), now)).toBe(false);
  });

  it('valida identidad, fechas, programación y número único', () => {
    const invalid = validateCourseWeekInput(
      { number: 1, title: '', startDate: '2026-08-08', endDate: '2026-08-07', status: 'programada' },
      [week({ id: 'other', number: 1 })],
    );
    expect(invalid.valid).toBe(false);
    if (!invalid.valid) expect(Object.keys(invalid.errors)).toEqual(expect.arrayContaining(['number', 'title', 'endDate', 'publishAt']));

    expect(validateCourseWeekInput({ number: 2, title: ' Semana 2 ', status: 'publicada' }).valid).toBe(true);
  });

  it('admite la semana cero y rechaza números negativos', () => {
    expect(validateCourseWeekInput({ number: 0, title: 'Presentación', status: 'borrador' }).valid).toBe(true);
    expect(validateCourseWeekInput({ number: -1, title: 'Inválida', status: 'borrador' }).valid).toBe(false);
    expect(validateCourseWeekInput({ number: '', title: 'Sin número', status: 'borrador' }).valid).toBe(false);
  });

  it('limita gestión a docentes asignados de cursos semanales', () => {
    const course = { organizationMode: 'semanal', teachers: ['teacher-1'] } as Course;
    expect(courseUsesWeeks(course)).toBe(true);
    expect(teacherCanManageWeeks(course, { id: 'teacher-1', role: 'docente' })).toBe(true);
    expect(teacherCanManageWeeks(course, { id: 'admin-1', role: 'admin' })).toBe(true);
    expect(teacherCanManageWeeks(course, { id: 'teacher-2', role: 'docente' })).toBe(false);
    expect(weekBelongsToCourse(week({}), 'course-1')).toBe(true);
  });

  it('filtra contenido semanal visible y conserva la vista tradicional', () => {
    const weeks = [week({ id: 'published', status: 'publicada' }), week({ id: 'draft', status: 'borrador', number: 2 })];
    const records = [{ id: 'visible', week: 'published' }, { id: 'hidden', week: 'draft' }, { id: 'unassigned' }];
    expect(filterContentForCourseMode({ organizationMode: 'semanal' }, weeks, records, now).map((item) => item.id)).toEqual(['visible']);
    expect(filterContentForCourseMode({ organizationMode: 'tradicional' }, weeks, records, now)).toEqual(records);
    expect(unassignedContent(records).map((item) => item.id)).toEqual(['unassigned']);
  });
});
