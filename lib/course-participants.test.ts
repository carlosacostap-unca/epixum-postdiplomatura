import { describe, expect, it } from 'vitest';
import type { Course, CourseEnrollment, User } from '@/types';
import {
  classifyCourseParticipantCandidates,
  normalizeParticipantPage,
  normalizeParticipantSearch,
  participantSearchExpression,
} from './course-participants';

const base = { collectionId: 'users', collectionName: 'users', created: '', updated: '' };
const users = [
  { ...base, id: 'available', name: 'Ada', username: 'ada', email: 'ada@example.com', role: 'admin' },
  { ...base, id: 'student', name: 'Estudiante', username: 'student', email: 'student@example.com', role: 'docente' },
  { ...base, id: 'teacher', name: 'Docente', username: 'teacher', email: 'teacher@example.com', role: 'estudiante' },
] as User[];
const course = { teachers: ['teacher'] } as Course;
const enrollments = [{ student: 'student' }] as CourseEnrollment[];

describe('contratos de participantes del curso', () => {
  it('normaliza búsqueda y página con límites seguros', () => {
    expect(normalizeParticipantSearch('  Ana   Pérez  ')).toBe('Ana Pérez');
    expect(normalizeParticipantSearch('x'.repeat(200))).toHaveLength(120);
    expect(normalizeParticipantPage('3')).toBe(3);
    expect(normalizeParticipantPage('-1')).toBe(1);
    expect(normalizeParticipantPage('texto')).toBe(1);
  });

  it('construye filtros separados para alumnos y docentes', () => {
    expect(participantSearchExpression('students', false)).toBe('course = {:courseId}');
    expect(participantSearchExpression('students', true)).toContain('student.email ~ {:query}');
    expect(participantSearchExpression('teachers', true)).toContain('courses_via_teachers.id ?= {:courseId}');
    expect(participantSearchExpression('teachers', true)).not.toContain('student.email');
    expect(participantSearchExpression('teachers', true)).not.toContain('username');
  });

  it('clasifica candidatos sin depender del rol global de compatibilidad', () => {
    const studentCandidates = classifyCourseParticipantCandidates(users, course, enrollments, 'students');
    expect(studentCandidates.map(({ userId, state }) => [userId, state])).toEqual([
      ['available', 'available'],
      ['student', 'current'],
      ['teacher', 'incompatible'],
    ]);
    expect(studentCandidates[0].globalRole).toBe('admin');

    const teacherCandidates = classifyCourseParticipantCandidates(users, course, enrollments, 'teachers');
    expect(teacherCandidates.map(({ userId, state }) => [userId, state])).toEqual([
      ['available', 'available'],
      ['student', 'incompatible'],
      ['teacher', 'current'],
    ]);
  });
});
