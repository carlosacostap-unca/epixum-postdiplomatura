import { describe, expect, it } from 'vitest';
import type { Assignment, Class, Course, Delivery } from '@/types';
import { studentCourseNavigation } from '@/lib/course-navigation';
import { getCourseGame } from './catalog';
import { buildCourseGame } from './model';

const course = { id: '5wdbs1o1p22vszm', status: 'en curso', organizationMode: 'tradicional' } as Course;
const config = getCourseGame(course)!;
const lesson = (id: string, patch = {}) => ({ id, course: course.id, title: id, date: '2026-11-10', publicationStatus: 'published', ...patch }) as Class;
const assignment = (id: string, patch = {}) => ({ id, course: course.id, title: id, publicationStatus: 'published', ...patch }) as Assignment;
const delivery = (id: string, patch = {}) => ({ id, assignment: id, student: 'student', status: 'pending', ...patch }) as Delivery;
function build(classes: Class[] = [], assignments: Assignment[] = [], deliveries: Delivery[] = []) {
  return buildCourseGame({ courseId: course.id, courseTitle: 'Curso', studentId: 'student', config, classes, assignments, deliveries, now: new Date('2026-11-08T12:00:00Z') });
}

describe('mapa de misiones', () => {
  it('habilita solamente el piloto tradicional autorizado y ofrece navegación', () => {
    expect(config.title).toBe('Valle de las Ideas');
    expect(getCourseGame({...course,status:'borrador'})).not.toBeNull();
    expect(studentCourseNavigation(course).some(item => item.label === 'Aventura')).toBe(true);
    for (const other of [{ ...course, id: 'mgk8u25zr4krpaw' }, { ...course, organizationMode: 'semanal' as const }]) {
      expect(getCourseGame(other)).toBeNull();
      expect(studentCourseNavigation(other).some(item => item.label === 'Aventura')).toBe(false);
    }
  });
  it('filtra curso, borradores y programación futura sin ocultar las clases publicadas futuras', () => {
    const records = [lesson('future-class'), lesson('draft', { publicationStatus: 'draft' }), lesson('other', { course: 'other' }), lesson('scheduled', { publicationStatus: 'scheduled', publishAt: '2026-11-09T12:00:00Z' }), lesson('released', { publicationStatus: 'scheduled', publishAt: '2026-11-07T12:00:00Z' })];
    expect(build(records).places.map(p => p.id)).toEqual(['future-class', 'released']);
    expect(build([], records.map(r => assignment(r.id, r))).missions.map(m => m.id)).toEqual(['future-class', 'released']);
  });
  it('no inventa tareas ni progreso cuando no hay trabajos', () => {
    expect(build([lesson('one')])).toMatchObject({ missions: [], completed: 0 });
  });
  it('conserva más de ocho clases y sus destinos', () => {
    const result = build(Array.from({ length: 10 }, (_, i) => lesson(String(i))));
    expect(result.places).toHaveLength(10);
    expect(result.places[9]).toMatchObject({ name: 'Rincón del valle 10', href: `/estudiantes/cursos/${course.id}/clases/9` });
  });
  it('solo cuenta aprobaciones propias publicadas de la versión actual', () => {
    const ids = ['approved', 'draft', 'other', 'stale', 'correction', 'resubmitted'];
    const result = build([], ids.map(id => assignment(id)), [
      delivery('approved', { status: 'published', verdict: 'Aprobado' }),
      delivery('draft', { status: 'draft', verdict: 'Aprobado', feedback: 'PRIVADO' }),
      delivery('other', { student: 'another', status: 'published', verdict: 'Aprobado' }),
      delivery('stale', { status: 'published', verdict: 'Aprobado', submissionVersion: 2, evaluatedVersion: 1 }),
      delivery('correction', { status: 'published', verdict: 'Corregir y reenviar' }),
      delivery('resubmitted', { resubmissionCount: 1 }),
    ]);
    expect(result.completed).toBe(1);
    expect(Object.fromEntries(result.missions.map(m => [m.id, m.state]))).toEqual({ approved: 'approved', draft: 'pending', other: 'available', stale: 'resubmitted', correction: 'correction_requested', resubmitted: 'resubmitted' });
    expect(JSON.stringify(result)).not.toContain('PRIVADO');
  });
});
