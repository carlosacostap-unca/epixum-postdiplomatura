import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CourseExamRequirements } from './CourseExamRequirements';
import { examRequirements } from '@/lib/course-exam-requirements';
it('muestra avance parcial y enlaces únicamente para las actividades pendientes', () => {
  render(<CourseExamRequirements courseId="tceqb7atji66fmd" requirements={examRequirements('tceqb7atji66fmd', 'fiasecondexam01').map((r, i) => ({ ...r, completed: i === 0 }))} />);
  expect(screen.getByText(/1 de 3 cumplidos/)).toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(2);
  expect(screen.getByRole('link', { name: /Realizar simulación/ })).toHaveAttribute('href', '/estudiantes/cursos/tceqb7atji66fmd/preparacion/iniciar/nqcx3so0zz4o86y');
});
