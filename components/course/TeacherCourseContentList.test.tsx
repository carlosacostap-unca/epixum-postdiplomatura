import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CourseContent } from '@/types';
import { ToastProvider } from '@/components/ui';
import { TeacherCourseContentList } from './TeacherCourseContentList';

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), reorder: vi.fn(), remove: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock('@/lib/actions-course-content', () => ({
  reorderCourseContents: mocks.reorder,
  deleteCourseContent: mocks.remove,
}));

const base = { collectionId: 'course_contents', collectionName: 'course_contents', created: '', updated: '', course: 'course-1', description: '' };
const contents: CourseContent[] = [
  { ...base, id: 'content-a', title: 'Primero', position: 0 },
  { ...base, id: 'content-b', title: 'Segundo', position: 1 },
];

describe('lista docente de contenidos', () => {
  it('muestra el orden y envía una permutación completa al mover', async () => {
    const user = userEvent.setup();
    mocks.reorder.mockResolvedValue({ success: true });
    render(<ToastProvider><TeacherCourseContentList courseId="course-1" contents={contents} /></ToastProvider>);
    expect(screen.getAllByText(/posición/i).map((node) => node.textContent)).toEqual(['Posición 1', 'Posición 2']);
    expect(screen.getByRole('button', { name: /mover primero hacia arriba/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /mover primero hacia abajo/i }));
    expect(mocks.reorder).toHaveBeenCalledWith('course-1', ['content-b', 'content-a']);
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('ofrece alta desde el estado vacío', () => {
    render(<ToastProvider><TeacherCourseContentList courseId="course-1" contents={[]} /></ToastProvider>);
    expect(screen.getByRole('link', { name: /crear contenido/i })).toHaveAttribute('href', '/docentes/cursos/course-1/contenidos/nuevo');
  });
});
