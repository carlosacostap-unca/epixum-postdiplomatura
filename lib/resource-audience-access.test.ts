import { beforeEach, expect, it, vi } from 'vitest';
import type { Link } from '@/types';

const mocks = vi.hoisted(() => ({
  requireBedel: vi.fn(), sign: vi.fn(), links: [] as Link[], getLinks: vi.fn(), getLink: vi.fn(),
}));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({}) }));
vi.mock('./course-bedel-access', () => ({ requireBedelAssignment: mocks.requireBedel }));
vi.mock('./s3', () => ({ getPresignedDownloadUrl: mocks.sign }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: async () => ({
  filter: (template: string) => template,
  collection: (name: string) => name === 'links' ? { getFullList: mocks.getLinks, getOne: mocks.getLink } : {
    getOne: async () => ({ id: 'course-1', course: 'course-1', contentsEnabled: true }),
    getFullList: async () => [],
  },
}) }));

import { getBedelCourse } from './course-bedel-data';
import { getBedelResourceDownloadUrl } from './actions-bedel-resources';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireBedel.mockResolvedValue({ id: 'bedel-1' });
  mocks.sign.mockResolvedValue('https://signed.example/guia.pdf');
  mocks.links = [
    { id: 'private-class', class: 'class-1', audience: 'teachers', url: 'guia.pdf', type: 'file' },
    { id: 'private-tp', assignment: 'tp-1', audience: 'teachers', url: 'guia.pdf', type: 'file' },
    { id: 'shared', class: 'class-1', audience: 'everyone', url: 'guia.pdf', type: 'file' },
    { id: 'legacy', assignment: 'tp-1', url: 'guia.pdf', type: 'file' },
    { id: 'content', content: 'content-1', url: 'guia.pdf', type: 'file' },
  ] as Link[];
  mocks.getLinks.mockImplementation(async () => structuredClone(mocks.links));
  mocks.getLink.mockImplementation(async (id: string) => structuredClone(mocks.links.find(link => link.id === id)));
});

it('no serializa recursos docentes en la supervisión de bedelía', async () => {
  const result = await getBedelCourse('course-1');
  expect(result.links.map(link => link.id)).toEqual(['shared', 'legacy', 'content']);
  expect(mocks.getLinks).toHaveBeenCalledWith(expect.objectContaining({ fields: expect.stringContaining('audience') }));
});

it.each(['private-class', 'private-tp'])('no firma la descarga directa del recurso docente %s para un bedel', async id => {
  expect(await getBedelResourceDownloadUrl('course-1', id)).toMatchObject({ success: false });
  expect(mocks.sign).not.toHaveBeenCalled();
});

it('conserva las descargas compartidas y anteriores para supervisión', async () => {
  for (const id of ['shared', 'legacy', 'content']) expect(await getBedelResourceDownloadUrl('course-1', id)).toMatchObject({ success: true });
});
