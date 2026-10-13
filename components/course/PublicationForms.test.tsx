import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Class } from '@/types';
import NewClassForm from '@/app/docentes/cursos/[id]/clases/nueva/NewClassForm';
import EditClassForm from '@/app/docentes/cursos/[id]/clases/[classId]/editar/EditClassForm';
import NuevoTpForm from '@/app/docentes/cursos/[id]/tps/nuevo/NuevoTpForm';

const mocks = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn() }));
vi.mock('@/lib/actions', () => ({ createClassForCourse: mocks.save, updateClass: mocks.save, createAssignmentForCourse: mocks.save }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, back: vi.fn() }) }));
vi.mock('@/components/RichTextEditor', () => ({ default: () => <div /> }));
beforeEach(() => { vi.clearAllMocks(); mocks.save.mockResolvedValue({ success: true, classId: 'class-1', assignmentId: 'tp-1' }); });

it.each(['nueva clase', 'editar clase', 'nuevo trabajo'])('envía estado y fecha UTC desde %s', async mode => {
  const { container } = render(mode === 'nueva clase' ? <NewClassForm courseId="course-1" weeks={[]} />
    : mode === 'editar clase' ? <EditClassForm courseId="course-1" weeks={[]} classData={{ id: 'class-1', title: 'Clase', date: '' } as Class} />
      : <NuevoTpForm courseId="course-1" weeks={[]} />);
  fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Material' } });
  await userEvent.selectOptions(screen.getByLabelText('Estado de publicación'), 'scheduled');
  fireEvent.change(screen.getByLabelText('Fecha y hora de publicación'), { target: { value: '2027-01-01T12:30' } });
  await userEvent.click(container.querySelector('button[type="submit"]')!);
  await waitFor(() => expect(mocks.save).toHaveBeenCalled());
  const sent = mocks.save.mock.calls[0][1] as FormData;
  expect(sent.get('publicationStatus')).toBe('scheduled');
  expect(sent.get('publishAt')).toBe(new Date('2027-01-01T12:30').toISOString());
});
