import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DeliveryDetailsPage from '@/app/assignments/[id]/deliveries/[deliveryId]/page';
import { getAssignment, getCourse, getDeliveries, getDeliveryById } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';
import type { Delivery } from '@/types';

vi.mock('@/lib/data', () => ({ getAssignment: vi.fn(), getCourse: vi.fn(), getDeliveries: vi.fn(), getDeliveryById: vi.fn() }));
vi.mock('@/lib/pocketbase-server', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/lib/actions-ai-config', () => ({ getAssignmentAIConfig: vi.fn().mockResolvedValue(null) }));
vi.mock('@/app/actions/openai', () => ({ getAIPreevaluationProviderStatus: vi.fn().mockResolvedValue({}), getLatestAIPreevaluation: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, notFound: () => { throw new Error('notFound'); } }));
vi.mock('./ReviewWorkspace', () => ({ default: ({ children, backHref, previous, next }: { children: React.ReactNode; backHref: string; previous?: { href: string }; next?: { href: string } }) => <div><a href={backHref}>Volver a entregas</a>{previous && <a href={previous.href}>Anterior</a>}{next && <a href={next.href}>Siguiente</a>}{children}</div> }));
vi.mock('./DeliveryMaterial', () => ({ default: () => <p>Material entregado</p> }));
vi.mock('@/app/assignments/[id]/deliveries/[deliveryId]/AIPreevaluationClient', () => ({ default: ({ deliveryId, submission }: { deliveryId: string; submission: React.ReactNode }) => <div data-testid="editor" data-delivery={deliveryId}>{submission}</div> }));

const current = { id: 'delivery0000001', assignment: 'assignment-1', student: 'student-1', status: 'pending', created: '2026-09-01T10:00:00Z', submissionVersion: 1, repositoryUrl: JSON.stringify({ type: 'url', url: 'https://example.com/trabajo' }), expand: { student: { firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' } } } as Delivery;
const props = { params: Promise.resolve({ id: 'assignment-1', deliveryId: current.id }), searchParams: Promise.resolve({ reviewQuery: 'Ana', reviewState: 'unreviewed' }) };

describe('detalle de corrección autorizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 'teacher-1', role: 'docente' } as never);
    vi.mocked(getAssignment).mockResolvedValue({ id: 'assignment-1', course: 'course-1', title: 'Trabajo práctico' } as never);
    vi.mocked(getDeliveryById).mockResolvedValue(current);
    vi.mocked(getCourse).mockResolvedValue({ id: 'course-1', title: 'Curso de prueba', teachers: ['teacher-1'] } as never);
    vi.mocked(getDeliveries).mockResolvedValue([current, { ...current, id: 'delivery0000002' }, { ...current, id: 'other-work', assignment: 'otro-tp' }]);
  });

  it('mantiene curso, trabajo, estudiante y filtros en los enlaces de revisión', async () => {
    render(await DeliveryDetailsPage(props));
    expect(getDeliveries).toHaveBeenCalledWith('assignment-1');
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('href', '/assignments/assignment-1/deliveries/delivery0000002?reviewQuery=Ana&reviewState=unreviewed');
    expect(screen.getByRole('link', { name: 'Volver a entregas' })).toHaveAttribute('href', '/docentes/cursos/course-1/tps/assignment-1?reviewQuery=Ana&reviewState=unreviewed#entregas');
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Curso de prueba' })).toHaveAttribute('href', '/docentes/cursos/course-1');
  });

  it('rechaza una entrega de otro trabajo antes de cargar la cola', async () => {
    vi.mocked(getDeliveryById).mockResolvedValue({ ...current, assignment: 'otro-tp' });
    await expect(DeliveryDetailsPage(props)).rejects.toThrow('notFound');
    expect(getDeliveries).not.toHaveBeenCalled();
  });

  it('rechaza un docente ajeno antes de cargar la cola', async () => {
    vi.mocked(getCourse).mockResolvedValue({ id: 'course-1', teachers: ['otro-docente'] } as never);
    await expect(DeliveryDetailsPage(props)).rejects.toThrow('redirect:/docentes');
    expect(getDeliveries).not.toHaveBeenCalled();
  });
});
