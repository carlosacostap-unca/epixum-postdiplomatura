import { render, screen, cleanup } from '@testing-library/react';
import { it, expect } from 'vitest';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import type { Course } from '@/types';

const course = { id: 'course-1', title: 'Curso', description: '', status: 'en curso', teachers: [] } as unknown as Course;
it('ofrece preparación a docentes y alumnos únicamente cuando el curso la habilita', () => {
  for (const Context of [TeacherCourseContext, StudentCourseContext]) {
    render(<Context course={course} current="resumen" />);
    expect(screen.queryByRole('link', { name: 'Preparación' })).not.toBeInTheDocument(); cleanup();
    render(<Context course={{ ...course, preparationEnabled: true }} current="resumen" />);
    expect(screen.getByRole('link', { name: 'Preparación' })).toHaveAttribute('href', expect.stringContaining('/preparacion')); cleanup();
  }
});
