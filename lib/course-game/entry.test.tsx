import { beforeEach, describe, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({ user: vi.fn(), course: vi.fn(), enrolled: vi.fn(), classes: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock('@/lib/pocketbase-server', () => ({ getCurrentUser: f.user }));
vi.mock('@/lib/data', () => ({ getCourse: f.course, isStudentEnrolled: f.enrolled, getClassesByCourse: f.classes, getAssignmentsByCourse: async () => [], getCourseOrganizationData: vi.fn(), getUserDelivery: vi.fn() }));
vi.mock('@/lib/actions-inquiries', () => ({ getInquiries: async () => [] }));
vi.mock('@/components/outcomes/StudentCourseOutcome', () => ({ StudentCourseOutcome: () => null }));
vi.mock('@/components/onboarding/CourseOnboardingSummary', () => ({ CourseOnboardingSummary: () => null }));
vi.mock('@/components/student/StudentCourseOverview', () => ({ default: () => null }));
import CoursePage from '@/app/estudiantes/cursos/[id]/page';
const id = '5wdbs1o1p22vszm';
const course = { id, title: 'Cohorte 2', status: 'en curso', organizationMode: 'tradicional', teachers: [] };
const page = (vista?: string) => CoursePage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({ vista }) });
beforeEach(() => { vi.clearAllMocks(); f.user.mockResolvedValue({ id: 'student' }); f.course.mockResolvedValue(course); f.enrolled.mockResolvedValue(true); f.classes.mockResolvedValue([]); });
describe('entrada al aula', () => {
  it('abre la aventura para el piloto matriculado', async () => {
    await expect(page()).rejects.toThrow(`redirect:/estudiantes/cursos/${id}/aventura`);
    expect(f.classes).not.toHaveBeenCalled();
  });
  it('permite el aula clásica sin ciclo de redirecciones', async () => {
    await expect(page('clasica')).resolves.toBeTruthy();
    expect(f.classes).toHaveBeenCalled();
  });
  it('verifica sesión y matrícula antes de redirigir al juego', async () => {
    f.user.mockResolvedValue(null);
    await expect(page()).rejects.toThrow('redirect:/login');
    f.user.mockResolvedValue({ id: 'student' }); f.enrolled.mockResolvedValue(false);
    await expect(page()).rejects.toThrow('redirect:/estudiantes');
  });
  it('mantiene la portada de cursos no habilitados', async () => {
    f.course.mockResolvedValue({ ...course, id: 'other' });
    await expect(page()).resolves.toBeTruthy();
  });
});
