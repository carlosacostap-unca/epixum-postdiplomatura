import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import example from '@/public/interactive-class-example.json';
import { ToastProvider } from '@/components/ui';
import { saveInteractiveLesson } from '@/lib/actions-interactive-classes';
import { InteractiveLessonForm } from './InteractiveLessonForm';
import type { Class } from '@/types';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => mocks }));
vi.mock('@/lib/actions-interactive-classes', () => ({ saveInteractiveLesson: vi.fn() }));

const classes = [{ id: 'class-1', title: 'Encuentro inicial' }] as Class[];
function file(source: string, name = 'material.json') {
  const value = new File([source], name, { type: 'application/json' });
  Object.defineProperty(value, 'text', { value: async () => source });
  return value;
}

describe('preparación de clase interactiva', () => {
  beforeEach(() => { vi.mocked(saveInteractiveLesson).mockReset().mockResolvedValue({ success: true, lessonId: 'lesson-1' }); mocks.push.mockReset(); });
  it('importa material, vincula una clase y guarda el estado preparado', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><InteractiveLessonForm courseId="course-1" classes={classes} /></ToastProvider>);
    await user.type(screen.getByLabelText('Título'), 'Clase de prueba');
    await user.selectOptions(screen.getByLabelText('Clase habitual asociada'), 'class-1');
    await user.upload(screen.getByLabelText('Importar material'), file(JSON.stringify(example)));
    expect(await screen.findByText('material.json · 4 pantallas')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Estado de preparación'), 'ready');
    await user.click(screen.getByRole('button', { name: 'Crear clase interactiva' }));
    const sent = vi.mocked(saveInteractiveLesson).mock.calls[0][2];
    expect(sent.get('status')).toBe('ready'); expect(sent.get('class')).toBe('class-1');
    expect(JSON.parse(String(sent.get('material'))).screens).toHaveLength(4);
    expect(sent.has('materialFile')).toBe(false);
    expect(mocks.push).toHaveBeenCalledWith('/docentes/cursos/course-1/interactivas/lesson-1');
  });
  it('conserva el material al importar un archivo inválido y bloquea guardado accidental', async () => {
    const user = userEvent.setup();
    render(<ToastProvider><InteractiveLessonForm courseId="course-1" classes={classes} /></ToastProvider>);
    await user.upload(screen.getByLabelText('Importar material'), file(JSON.stringify(example)));
    await user.upload(screen.getByLabelText('Importar material'), file('{', 'incorrecto.json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Se conservó el material anterior');
    expect(screen.getByText('material.json · 4 pantallas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear clase interactiva' })).toBeDisabled();
    expect(saveInteractiveLesson).not.toHaveBeenCalled();
  });
  it('conserva los datos y permite reintentar un fallo al guardar', async () => {
    vi.mocked(saveInteractiveLesson).mockRejectedValue(new Error('Error de conexión'));
    const user = userEvent.setup();
    render(<ToastProvider><InteractiveLessonForm courseId="course-1" classes={[]} /></ToastProvider>);
    await user.type(screen.getByLabelText('Título'), 'Borrador');
    await user.click(screen.getByRole('button', { name: 'Crear clase interactiva' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Crear clase interactiva' })).toBeEnabled());
    expect(screen.getByLabelText('Título')).toHaveValue('Borrador');
  });
});
