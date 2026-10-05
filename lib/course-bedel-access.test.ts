import { describe, expect, it, vi } from 'vitest';
import type PocketBase from 'pocketbase';
import { assertNotCourseBedel, hasBedelCourses } from './course-bedel-access';

function client(error?: unknown, verified = true) {
  const getFirstListItem = error ? vi.fn().mockRejectedValue(error) : vi.fn().mockResolvedValue({ id: 'assignment' });
  const getList = error ? vi.fn().mockRejectedValue(error) : vi.fn().mockResolvedValue({ totalItems: 1 });
  const pb = {
    authStore: { model: { email: 'BEDEL@EXAMPLE.COM', verified } },
    filter: (_expression: string, values: unknown) => values,
    collection: () => ({ getFirstListItem, getList }),
  } as unknown as PocketBase;
  return { pb, getFirstListItem, getList };
}

describe('permisos de bedel', () => {
  it('impide matricular o asignar como docente al bedel del mismo curso', async () => {
    const { pb, getFirstListItem } = client();
    await expect(assertNotCourseBedel(pb, 'course-a', ' BEDEL@EXAMPLE.COM ')).rejects.toThrow('Retirá esa asignación');
    expect(getFirstListItem).toHaveBeenCalledWith({ courseId: 'course-a', email: 'bedel@example.com' }, { fields: 'id' });
  });
  it('permite otros roles cuando no hay asignación y propaga fallas de conexión', async () => {
    await expect(assertNotCourseBedel(client({ status: 404 }).pb, 'course-a', 'bedel@example.com')).resolves.toBeUndefined();
    await expect(assertNotCourseBedel(client({ status: 500 }).pb, 'course-a', 'bedel@example.com')).rejects.toMatchObject({ status: 500 });
  });
  it('no habilita el espacio con una identidad sin verificar', async () => {
    const { pb, getList } = client(undefined, false);
    expect(await hasBedelCourses(pb)).toBe(false);
    expect(getList).not.toHaveBeenCalled();
    expect(await hasBedelCourses(client().pb)).toBe(true);
  });
  it('mantiene el login durante el despliegue aditivo pero no oculta errores de red', async () => {
    expect(await hasBedelCourses(client({ status: 404 }).pb)).toBe(false);
    await expect(hasBedelCourses(client({ status: 500 }).pb)).rejects.toMatchObject({ status: 500 });
  });
});
