import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui';
import { CourseContentForm } from './CourseContentForm';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/lib/actions-course-content', () => ({ createCourseContent: mocks.create, updateCourseContent: mocks.update }));
vi.mock('@/components/RichTextEditor', () => ({ default: ({ onChange }: { onChange: (value: string) => void }) => <button type="button" onClick={() => onChange('<p>Descripción</p>')}>Editar descripción</button> }));

describe('formulario de contenido', () => {
  it('crea contenido con título y descripción enriquecida', async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue({ success: true, contentId: 'content-1' });
    render(<ToastProvider><CourseContentForm courseId="course-1" /></ToastProvider>);
    await user.type(screen.getByLabelText('Título'), 'Introducción');
    await user.click(screen.getByRole('button', { name: 'Editar descripción' }));
    await user.click(screen.getByRole('button', { name: 'Crear contenido' }));
    expect(mocks.create).toHaveBeenCalledWith('course-1', expect.any(FormData));
    const sent = mocks.create.mock.calls[0][1] as FormData;
    expect(sent.get('title')).toBe('Introducción');
    expect(sent.get('description')).toBe('<p>Descripción</p>');
    expect(mocks.push).toHaveBeenCalledWith('/docentes/cursos/course-1/contenidos/content-1');
  });
});
