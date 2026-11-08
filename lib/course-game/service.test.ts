import { describe, expect, it, vi } from 'vitest';
import type PocketBase from 'pocketbase';
import { readCourseGame } from './service';

vi.mock('@/lib/pocketbase-server', () => ({ createServerClient: vi.fn() }));
const courseId = '5wdbs1o1p22vszm';
function fixture({ valid = true, enrolled = true, teacher = false, enabled = true, fail = '', draft = false, guest = false } = {}) {
  const calls: { collection: string; filter?: string; fields?: string }[] = [];
  const pb = {
    authStore: { isValid: valid, record: { id: 'student', role: 'docente' } },
    filter: (expression: string, values: unknown) => JSON.stringify({ expression, values }),
    collection: (name: string) => ({
      getOne: async () => ({ id: enabled ? courseId : 'another', status: draft ? 'borrador' : 'en curso', guestStudents:guest?['student']:[], organizationMode: 'tradicional', teachers: teacher ? ['student'] : [], title: 'Curso' }),
      getFirstListItem: async (filter: string) => { calls.push({ collection: name, filter }); if (fail === name) throw new Error('Network'); if (!enrolled) throw { status: 404 }; return { id: 'enrollment' }; },
      getFullList: async (options: { filter: string; fields: string }) => { calls.push({ collection: name, ...options }); if (fail === name) throw new Error('Network'); return []; },
    }),
  } as unknown as PocketBase;
  return { pb, calls };
}

describe('acceso al mapa', () => {
  it('permite el piloto borrador a un estudiante invitado matriculado',async()=>{expect(await readCourseGame(fixture({draft:true,guest:true}).pb,courseId)).not.toBeNull();});
  it.each([{draft:true}, { valid: false }, { enrolled: false }, { teacher: true }, { enabled: false }])('rechaza acceso antes de consultar contenido: %j', async options => {
    const f = fixture(options);
    expect(await readCourseGame(f.pb, courseId)).toBeNull();
    expect(f.calls.some(call => ['classes', 'assignments', 'deliveries'].includes(call.collection))).toBe(false);
  });
  it('acepta matrícula aunque el rol global sea docente y acota consultas al curso y usuario', async () => {
    const f = fixture();
    expect(await readCourseGame(f.pb, courseId)).toMatchObject({ courseId, completed: 0 });
    const query = f.calls.find(call => call.collection === 'deliveries')!;
    expect(JSON.parse(query.filter!)).toEqual({ expression: 'assignment.course = {:course} && student = {:student}', values: { course: courseId, student: 'student' } });
    expect(query.fields).not.toContain('feedback');
    expect(query.fields).not.toContain('repositoryUrl');
  });
  it.each(['course_enrollments', 'classes', 'assignments', 'deliveries'])('propaga fallos de %s sin simular progreso vacío', async fail => {
    const f = fixture({ fail });
    await expect(readCourseGame(f.pb, courseId)).rejects.toThrow('Network');
  });
});
