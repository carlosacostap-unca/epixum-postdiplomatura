import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@/types';
import type { CourseOutcome } from '@/lib/course-outcomes';
import { OutcomeEditor } from './OutcomeEditor';
import { OutcomeCard } from './OutcomeCard';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import CourseAdminNavigation from '@/components/CourseAdminNavigation';

const actions = vi.hoisted(() => ({ manage: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/actions-course-outcomes', () => ({ manageCourseOutcome: actions.manage }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: actions.refresh }), usePathname: () => '/' }));
const courseId = 'course000000001'; const studentId = 'student00000001';
const current: CourseOutcome = { id: 'outcome00000001', course: courseId, student: studentId, draft: { status: 'aprobado', grade: 8, feedback: 'Borrador privado' }, published: null, revision: 'v1' };
beforeEach(() => { vi.clearAllMocks(); actions.manage.mockResolvedValue({ success: true }); });

describe('resultados de cursada: interfaz', () => {
  it('guarda sin nota ni devolución y no publica automáticamente', async () => {
    const user = userEvent.setup();
    render(<OutcomeEditor courseId={courseId} studentId={studentId} studentName="Alumno A" outcome={null} />);
    expect(screen.getByRole('button', { name: 'Publicar resultado' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText(/Estado final de la cursada/), 'no_completo');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(actions.manage).toHaveBeenCalledWith(courseId, studentId, '', 'save', { status: 'no_completo', grade: null, feedback: '' }));
    expect(actions.manage).toHaveBeenCalledTimes(1);
  });
  it('acepta nota cero y bloquea publicación si hay cambios sin guardar', async () => {
    const user = userEvent.setup();
    render(<OutcomeEditor courseId={courseId} studentId={studentId} studentName="Alumno A" outcome={current} />);
    expect(screen.getByRole('button', { name: 'Publicar resultado' })).toBeEnabled();
    const grade = screen.getByLabelText(/Nota final \(opcional\)/);
    await user.clear(grade); await user.type(grade, '0');
    expect(screen.getByRole('button', { name: 'Publicar resultado' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('cambios sin guardar');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(actions.manage).toHaveBeenCalledWith(courseId, studentId, 'v1', 'save', { ...current.draft, grade: 0 }));
  });
  it('valida la nota en el cliente y conserva los datos cuando falla el guardado', async () => {
    const user = userEvent.setup();
    actions.manage.mockResolvedValue({ success: false, error: 'El resultado cambió. Actualizá la página.' });
    const view = render(<OutcomeEditor courseId={courseId} studentId={studentId} studentName="Alumno A" outcome={current} />);
    fireEvent.change(screen.getByLabelText(/Nota final \(opcional\)/), { target: { value: '11' } });
    fireEvent.submit(view.container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('0 y 10');
    expect(actions.manage).not.toHaveBeenCalled();
    const grade = screen.getByLabelText(/Nota final \(opcional\)/); await user.clear(grade); await user.type(grade, '9');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El resultado cambió');
    expect(grade).toHaveValue(9);
  });
  it('publica la versión guardada con confirmación individual', async () => {
    const user = userEvent.setup();
    render(<OutcomeEditor courseId={courseId} studentId={studentId} studentName="Alumno A" outcome={current} />);
    await user.click(screen.getByRole('button', { name: 'Publicar resultado' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Alumno A'); expect(dialog).toHaveTextContent('Solamente este alumno');
    await user.click(within(dialog).getByRole('button', { name: /^Publicar$/ }));
    await waitFor(() => expect(actions.manage).toHaveBeenCalledWith(courseId, studentId, 'v1', 'publish', undefined));
  });
  it('distingue el resultado publicado de la corrección y permite retirar su publicación', async () => {
    const user = userEvent.setup();
    const published = { status: 'no_aprobado' as const, grade: 0, feedback: 'Versión visible', publishedAt: '2026-10-30T18:00:00Z' };
    render(<OutcomeEditor courseId={courseId} studentId={studentId} studentName="Alumno A" outcome={{ ...current, published }} />);
    expect(screen.getByText('No aprobado', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Nota final: 0')).toBeInTheDocument();
    expect(screen.getByText('Versión visible')).toBeInTheDocument();
    expect(screen.getByLabelText(/Devolución \(opcional\)/)).toHaveValue('Borrador privado');
    await user.click(screen.getByRole('button', { name: 'Retirar publicación' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Retirar publicación' }));
    await waitFor(() => expect(actions.manage).toHaveBeenCalledWith(courseId, studentId, 'v1', 'withdraw', undefined));
  });
  it('presenta resultado propio con campos opcionales y pendiente sin inventar estado', () => {
    const { rerender } = render(<OutcomeCard result={null} />);
    expect(screen.getByText(/todavía no publicó tu resultado/)).toBeInTheDocument();
    expect(screen.queryByText('Aprobado')).not.toBeInTheDocument();
    rerender(<OutcomeCard result={{ status: 'no_completo', grade: null, feedback: '', publishedAt: '2026-10-30T18:00:00Z' }} />);
    expect(screen.getByText('No completó')).toBeInTheDocument();
    expect(screen.queryByText(/Nota final:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Historial|Borrador/)).not.toBeInTheDocument();
  });
  it('muestra accesos solamente cuando la administración habilita el curso', () => {
    const course = { id: courseId, title: 'Curso', description: '', status: 'en curso' } as Course;
    const { rerender } = render(<TeacherCourseContext course={course} current="resumen" />);
    expect(screen.queryByRole('link', { name: 'Resultados de cursada' })).not.toBeInTheDocument();
    rerender(<TeacherCourseContext course={{ ...course, outcomesEnabled: true }} current="resultados" />);
    expect(screen.getByRole('link', { name: 'Resultados de cursada' })).toHaveAttribute('href', `/docentes/cursos/${courseId}/resultados`);
    rerender(<CourseAdminNavigation courseId={courseId} outcomesEnabled />);
    expect(screen.getByRole('link', { name: 'Resultados de cursada' })).toHaveAttribute('href', `/admin/courses/${courseId}/resultados`);
    rerender(<CourseAdminNavigation courseId={courseId} />);
    expect(screen.queryByRole('link', { name: 'Resultados de cursada' })).not.toBeInTheDocument();
  });
});
