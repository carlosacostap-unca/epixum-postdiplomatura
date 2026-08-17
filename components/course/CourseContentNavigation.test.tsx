import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Course } from '@/types';
import { TeacherCourseContext } from './TeacherCourseContext';
import { StudentCourseContext } from './StudentCourseContext';

const course: Course = {
  id: 'course-1', collectionId: 'courses', collectionName: 'courses', created: '', updated: '',
  title: 'Curso', description: '', status: 'en curso', organizationMode: 'semanal', teachers: ['teacher-1'], contentsEnabled: true,
};

describe('navegación de contenidos', () => {
  it('muestra la pestaña a docentes y estudiantes cuando está habilitada, incluso en modo semanal', () => {
    const { unmount } = render(<TeacherCourseContext course={course} current="contenidos" />);
    expect(screen.getByRole('link', { name: /contenidos/i })).toHaveAttribute('href', '/docentes/cursos/course-1/contenidos');
    unmount();
    render(<StudentCourseContext course={course} current="contenidos" />);
    expect(screen.getByRole('link', { name: /contenidos/i })).toHaveAttribute('href', '/estudiantes/cursos/course-1/contenidos');
  });

  it('oculta la pestaña cuando el administrador deshabilita la característica', () => {
    const disabled = { ...course, contentsEnabled: false };
    const { unmount } = render(<TeacherCourseContext course={disabled} current="resumen" />);
    expect(screen.queryByRole('link', { name: /contenidos/i })).not.toBeInTheDocument();
    unmount();
    render(<StudentCourseContext course={disabled} current="resumen" />);
    expect(screen.queryByRole('link', { name: /contenidos/i })).not.toBeInTheDocument();
  });
});
