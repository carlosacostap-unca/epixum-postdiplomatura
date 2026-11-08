import { describe, expect, it, vi } from 'vitest';
import type PocketBase from 'pocketbase';
import { advanceGameTour, readGameWelcome, saveGameIdentity, updateGameIdentity } from './onboarding-service';
import { DEFAULT_CHARACTER, completedTourSteps, enrollmentCharacterSchema } from './onboarding';
vi.mock('@/lib/pocketbase-server', () => ({ createServerClient: vi.fn() }));
const course = '5wdbs1o1p22vszm';
const input = { character: DEFAULT_CHARACTER, profile: { firstName: 'Ana', lastName: 'Prueba', dni: '12.345.678', birthDate: '1990-01-01', contactEmail: 'demo@example.invalid', phone: '+5491112345678', confirmed: true } };
function fixture({ enrolled = true, saved = false, steps = [] as number[], batchFail = false, missing = false } = {}) {
  let row: Record<string, unknown> | null = saved ? { id: 'welcome', character: DEFAULT_CHARACTER, contactEmail: input.profile.contactEmail, profileConfirmedAt: '2026-01-01' } : null;
  const reads: unknown[] = [], writes: { name: string; id?: string; data: Record<string, unknown> }[] = [];
  const pb = { authStore: { isValid: true, record: { id: 'self', email: 'login@example.invalid' } }, filter: (query: string, values: unknown) => JSON.stringify({ query, values }), collection: () => ({ getOne: async () => ({ id: course, organizationMode: 'tradicional', status: 'en curso', teachers: [] }), getFirstListItem: async () => { if (!enrolled) throw { status: 404 }; return { id: 'enrolled' }; } }) } as unknown as PocketBase;
  const send = vi.fn(async () => { if (batchFail) throw new Error('Unavailable'); row = { id: 'welcome', ...writes.find(w => w.name === 'course_game_onboarding')!.data }; });
  const service = { filter: pb.filter, collection: (name: string) => ({
    getList: async (_p: number, _n: number, options: unknown) => { reads.push(options); if (missing) throw new Error('Missing collection'); return { items: row ? [row] : [] }; },
    getFullList: async () => steps.map(step => ({ step })),
    create: async (data: Record<string, unknown>) => { writes.push({ name, data }); steps.push(Number(data.step)); },
  }), createBatch: () => ({ collection: (name: string) => ({ update: (id: string, data: Record<string, unknown>) => writes.push({ name, id, data }), create: (data: Record<string, unknown>) => writes.push({ name, data }) }), send }) } as unknown as PocketBase;
  return { pb, service, reads, writes, send };
}
describe('bienvenida privada del juego', () => {
  it('actualiza solo el perfil propio y conserva el recorrido completado', async () => {
    const f = fixture({saved:true,steps:[1,2,3,4,5]});
    const character = {...DEFAULT_CHARACTER, petName:'Chispa', shirt:'rojo'};
    expect(await updateGameIdentity(f.pb,f.service,course,{...input,character})).toMatchObject({character,tourStep:5,completed:true});
    expect(f.send).toHaveBeenCalledOnce();
    expect(f.writes).toHaveLength(2);
    expect(f.writes[0]).toMatchObject({name:'users',id:'self'});
    expect(f.writes[0].data).not.toHaveProperty('email');
    expect(f.writes[1]).toMatchObject({name:'course_game_onboarding',id:'welcome',data:{character}});
  });
  it('rechaza ediciones sin acceso o bienvenida y propaga fallos de guardado', async () => {
    for (const options of [{enrolled:false},{saved:false},{saved:true,batchFail:true}]) {
      const f=fixture(options);
      await expect(updateGameIdentity(f.pb,f.service,course,input)).rejects.toThrow();
      if (!options.saved) expect(f.writes).toHaveLength(0);
    }
  });
  it('rechaza un usuario sin matrícula antes de consultar o escribir con privilegios', async () => {
    const f = fixture({ enrolled: false });
    await expect(saveGameIdentity(f.pb, f.service, course, input)).rejects.toThrow();
    await expect(readGameWelcome(f.pb, f.service, course)).rejects.toThrow();
    await expect(advanceGameTour(f.pb, f.service, course, 0)).rejects.toThrow();
    expect(f.reads).toHaveLength(0); expect(f.writes).toHaveLength(0);
  });
  it('acota al usuario autenticado y guarda perfil y personaje en un único batch sin cambiar email de acceso', async () => {
    const f = fixture();
    expect(await saveGameIdentity(f.pb, f.service, course, input)).toMatchObject({ tourStep: 0, completed: false });
    expect(f.send).toHaveBeenCalledOnce();
    expect(f.writes).toHaveLength(2);
    expect(f.writes[0]).toMatchObject({ name: 'users', id: 'self', data: { dni: '12345678', birthDate: '1990-01-01T12:00:00.000Z' } });
    expect(f.writes[0].data).not.toHaveProperty('email');
    expect(f.writes[1].data).toMatchObject({ course, student: 'self', contactEmail: 'demo@example.invalid' });
    expect(f.writes[1].data).not.toHaveProperty('dni');
    expect(f.reads[0]).toMatchObject({ filter: expect.stringContaining('"student":"self"') });
  });
  it('no simula guardado cuando falla el batch o falta la colección', async () => {
    const f = fixture({ batchFail: true });
    await expect(saveGameIdentity(f.pb, f.service, course, input)).rejects.toThrow('Unavailable');
    const missing = fixture({ missing: true });
    await expect(readGameWelcome(missing.pb, missing.service, course)).rejects.toThrow('Missing collection');
  });
  it('un reenvío conserva el personaje y no reescribe el perfil', async () => {
    const f = fixture({ saved: true, steps: [1, 2] });
    expect(await saveGameIdentity(f.pb, f.service, course, input)).toMatchObject({ tourStep: 2 });
    expect(f.writes).toHaveLength(0);
  });
  it('requiere perfil confirmado y recorrido secuencial; tolera un paso repetido', async () => {
    const empty = fixture(); await expect(advanceGameTour(empty.pb, empty.service, course, 0)).rejects.toThrow('Primero');
    const f = fixture({ saved: true, steps: [1] });
    await expect(advanceGameTour(f.pb, f.service, course, 3)).rejects.toThrow('orden');
    expect(await advanceGameTour(f.pb, f.service, course, 0)).toMatchObject({ tourStep: 1 });
    expect(f.writes).toHaveLength(0);
    expect(await advanceGameTour(f.pb, f.service, course, 1)).toMatchObject({ tourStep: 2, completed: false });
    expect(f.writes[0]).toMatchObject({ name: 'course_game_tour_steps', data: { onboarding: 'welcome', version: 1, step: 2 } });
  });
  it('retoma el recorrido y completa solamente tras el último paso', async () => {
    const f = fixture({ saved: true, steps: [1, 2, 3, 4] });
    expect(await readGameWelcome(f.pb, f.service, course)).toMatchObject({ tourStep: 4, completed: false });
    expect(await advanceGameTour(f.pb, f.service, course, 4)).toMatchObject({ tourStep: 5, completed: true });
    expect(await readGameWelcome(f.pb, f.service, course)).toMatchObject({ tourStep: 5, completed: true });
    expect(completedTourSteps([1, 3, 4, 5])).toBe(1);
  });
  it.each([{ dni: 'abc' }, { contactEmail: 'bad' }, { birthDate: '2099-01-01' }, { phone: '123' }, { confirmed: false }])('valida los datos obligatorios: %j', bad => {
    expect(enrollmentCharacterSchema.safeParse({ ...input, profile: { ...input.profile, ...bad } }).success).toBe(false);
  });
});
