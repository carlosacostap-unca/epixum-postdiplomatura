import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Course } from '@/types';
import { SurveyEditor } from './SurveyEditor';
import { SurveyDraft } from './SurveyDraft';
import { SurveyResponseForm } from './SurveyResponseForm';
import { SurveyResults } from './SurveyResults';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { aggregateSurvey, type CourseSurvey } from '@/lib/course-surveys';

const actions = vi.hoisted(() => ({ save: vi.fn(), respond: vi.fn(), manage: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock('@/lib/actions-course-surveys', () => ({ saveSurvey: actions.save, respondSurvey: actions.respond, manageSurvey: actions.manage }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: actions.push, refresh: actions.refresh }), usePathname: () => '/' }));
const courseId = 'course000000001';
const base = `/docentes/cursos/${courseId}/encuestas`;
const survey: CourseSurvey = { id: 'survey000000001', course: courseId, title: 'Consulta inicial', description: '', status: 'published', anonymous: true, closesAt: '', revision: 'v1', questions: [{ id: 'q', title: '¿Qué esperás del curso?', type: 'text', required: true, options: [] }] };

beforeEach(() => {
  vi.clearAllMocks();
  actions.save.mockResolvedValue({ success: true, id: survey.id });
  actions.respond.mockResolvedValue({ success: true });
  actions.manage.mockResolvedValue({ success: true, id: survey.id });
});

describe('encuestas: interfaz', () => {
  it('diseña, reordena y guarda preguntas de tipos distintos', async () => {
    const user = userEvent.setup();
    render(<SurveyEditor courseId={courseId} base={base} />);
    await user.type(screen.getByLabelText(/Título de la encuesta/), 'Diagnóstico');
    await user.click(screen.getByRole('button', { name: 'Agregar pregunta' }));
    await user.type(screen.getByLabelText(/Enunciado de la pregunta 1/), 'Experiencia');
    await user.type(screen.getByLabelText(/Opción 1 de la pregunta 1/), 'Sí');
    await user.type(screen.getByLabelText(/Opción 2 de la pregunta 1/), 'No');
    await user.click(screen.getByRole('button', { name: 'Agregar pregunta' }));
    await user.type(screen.getByLabelText(/Enunciado de la pregunta 2/), 'Expectativas');
    await user.selectOptions(screen.getByLabelText('Tipo de la pregunta 2'), 'text');
    await user.click(screen.getByRole('button', { name: 'Subir pregunta 2' }));
    await user.selectOptions(screen.getByLabelText('Privacidad de las respuestas'), 'anonymous');
    await user.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    await waitFor(() => expect(actions.save).toHaveBeenCalledWith(courseId, null, '', expect.objectContaining({ title: 'Diagnóstico', anonymous: true, questions: [expect.objectContaining({ title: 'Expectativas', type: 'text', options: [] }), expect.objectContaining({ title: 'Experiencia', type: 'single' })] })));
    expect(actions.push).toHaveBeenCalledWith(`${base}/${survey.id}`);
  }, 15000);
  it('impide publicar una versión con cambios pendientes de guardar', async () => {
    const user = userEvent.setup();
    render(<SurveyDraft survey={{ ...survey, status: 'draft' }} base={base} />);
    expect(screen.getByRole('button', { name: 'Publicar encuesta guardada' })).toBeEnabled();
    await user.type(screen.getByLabelText(/Título de la encuesta/), ' nuevo');
    expect(screen.getByRole('button', { name: 'Publicar encuesta guardada' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Duplicar encuesta' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Guardá los cambios');
    expect(actions.manage).not.toHaveBeenCalled();
  });
  it('publica con confirmación explícita de diseño y privacidad fijos', async () => {
    const user = userEvent.setup();
    render(<SurveyDraft survey={{ ...survey, status: 'draft' }} base={base} />);
    await user.click(screen.getByRole('button', { name: 'Publicar encuesta guardada' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Las preguntas y la privacidad quedarán fijas');
    await user.click(within(dialog).getByRole('button', { name: /^Publicar$/ }));
    await waitFor(() => expect(actions.manage).toHaveBeenCalledWith(courseId, survey.id, 'publish', 'v1'));
  });
  it('valida antes de enviar y confirma sin volver a mostrar el formulario', async () => {
    const user = userEvent.setup();
    const view = render(<SurveyResponseForm survey={survey} submitted={false} />);
    fireEvent.submit(view.container.querySelector('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Respondé la pregunta');
    expect(actions.respond).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText('¿Qué esperás del curso?'), 'Aprender');
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tu respuesta fue enviada');
    expect(actions.respond).toHaveBeenCalledWith(courseId, survey.id, { q: 'Aprender' });
    expect(screen.queryByRole('button', { name: 'Enviar respuestas' })).not.toBeInTheDocument();
  });
  it('conserva respuestas ante un fallo y permite reintentar', async () => {
    actions.respond.mockResolvedValueOnce({ success: false, error: 'Reintentá el envío.' });
    const user = userEvent.setup();
    render(<SurveyResponseForm survey={survey} submitted={false} />);
    await user.type(screen.getByLabelText('¿Qué esperás del curso?'), 'Aprender');
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Reintentá');
    expect(screen.getByLabelText('¿Qué esperás del curso?')).toHaveValue('Aprender');
    await user.click(screen.getByRole('button', { name: 'Enviar respuestas' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Tu respuesta fue enviada');
  });
  it('muestra confirmación de participación previa y bloquea una encuesta vencida', () => {
    const { rerender } = render(<SurveyResponseForm key="submitted" survey={survey} submitted />);
    expect(screen.getByRole('status')).toHaveTextContent('Tu respuesta fue enviada');
    rerender(<SurveyResponseForm key="expired" survey={{ ...survey, closesAt: '2000-01-01T00:00:00Z' }} submitted={false} />);
    expect(screen.getByRole('heading', { name: 'Encuesta cerrada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar respuestas' })).not.toBeInTheDocument();
  });
  it('muestra textos anónimos sin filas individuales y gráficos accesibles', () => {
    const choice = { ...survey.questions[0], id: 'scale', title: 'Valoración', type: 'scale' as const, options: [] };
    const current = { ...survey, questions: [...survey.questions, choice] };
    const results = { ...aggregateSurvey(current, [{ student: 'private', answers: { q: 'Más práctica', scale: 5 } }]), individuals: [{ name: 'No debe aparecer', answers: { q: 'Más práctica' } }] };
    render(<SurveyResults survey={current} results={results} />);
    expect(screen.getByText('Más práctica')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: '5' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByText('No debe aparecer')).not.toBeInTheDocument();
    expect(screen.queryByText('Respuestas por alumno')).not.toBeInTheDocument();
  });
  it('muestra la navegación únicamente en los cursos habilitados para ambos espacios', () => {
    const course = { id: courseId, title: 'Curso', description: '', status: 'en curso' } as Course;
    const { rerender } = render(<TeacherCourseContext course={course} current="resumen" />);
    expect(screen.queryByRole('link', { name: 'Encuestas' })).not.toBeInTheDocument();
    rerender(<TeacherCourseContext course={{ ...course, surveysEnabled: true }} current="encuestas" />);
    expect(screen.getByRole('link', { name: 'Encuestas' })).toHaveAttribute('href', base);
    rerender(<StudentCourseContext course={{ ...course, surveysEnabled: true }} current="encuestas" />);
    expect(screen.getByRole('link', { name: 'Encuestas' })).toHaveAttribute('href', `/estudiantes/cursos/${courseId}/encuestas`);
    rerender(<StudentCourseContext course={course} current="resumen" />);
    expect(screen.queryByRole('link', { name: 'Encuestas' })).not.toBeInTheDocument();
  });
});
