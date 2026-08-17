import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  model: { id: 'teacher-1', role: 'docente' } as { id: string; role: string } | null,
  enabled: true,
  enrolled: true,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  download: vi.fn(async () => 'https://signed.example/file.pdf'),
  upload: vi.fn(async () => ({ url: 'https://upload.example/file.pdf?signature=x', fields: {} })),
}));

const records = {
  courses: {
    'course-1': { id: 'course-1', teachers: ['teacher-1'], organizationMode: 'tradicional' },
  } as Record<string, Record<string, unknown>>,
  course_contents: {
    'content-1': { id: 'content-1', course: 'course-1' },
  } as Record<string, Record<string, unknown>>,
  classes: {
    'class-1': { id: 'class-1', course: 'course-1' },
  } as Record<string, Record<string, unknown>>,
  assignments: {} as Record<string, Record<string, unknown>>,
  links: {
    'link-1': { id: 'link-1', content: 'content-1', title: 'Archivo', url: 'https://files.example/file.pdf', type: 'file' },
  } as Record<string, Record<string, unknown>>,
};

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { get model() { return mocks.model; } },
    filter: (_template: string, values: Record<string, string>) => JSON.stringify(values),
    collection(name: keyof typeof records | 'course_enrollments') {
      return {
        async getOne(id: string) {
          if (name === 'courses') return { ...records.courses[id], contentsEnabled: mocks.enabled };
          const value = name === 'course_enrollments' ? undefined : records[name][id];
          if (!value) throw new Error('not found');
          return structuredClone(value);
        },
        async getFirstListItem() {
          if (!mocks.enrolled) throw new Error('not enrolled');
          return { id: 'enrollment-1' };
        },
        create: mocks.create,
        update: mocks.update,
        delete: mocks.remove,
      };
    },
  })),
}));
vi.mock('./s3', () => ({
  getPresignedUploadUrl: mocks.upload,
  getPresignedDownloadUrl: mocks.download,
  configureBucketCors: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { createLink, getResourceDownloadUrl, getResourceUploadUrl } from './actions';

function linkForm(parent: { classId?: string; assignmentId?: string; contentId?: string }) {
  const form = new FormData();
  form.set('title', 'Guía');
  form.set('url', 'https://example.com/guia');
  form.set('type', 'link');
  for (const [key, value] of Object.entries(parent)) if (value) form.set(key, value);
  return form;
}

describe('recursos de contenidos independientes', () => {
  beforeEach(() => {
    mocks.model = { id: 'teacher-1', role: 'docente' };
    mocks.enabled = true;
    mocks.enrolled = true;
    mocks.create.mockReset().mockResolvedValue({ id: 'link-new' });
    mocks.update.mockReset();
    mocks.remove.mockReset();
    mocks.download.mockClear();
    mocks.upload.mockClear();
  });

  it('crea un recurso con contenido como único padre', async () => {
    await expect(createLink(linkForm({ contentId: 'content-1' }))).resolves.toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ content: 'content-1' }));
    expect(mocks.create.mock.calls[0][0]).not.toHaveProperty('class');
  });

  it('rechaza padres ausentes o múltiples', async () => {
    await expect(createLink(linkForm({}))).resolves.toMatchObject({ success: false, error: expect.stringContaining('exactamente un padre') });
    await expect(createLink(linkForm({ classId: 'class-1', contentId: 'content-1' }))).resolves.toMatchObject({ success: false });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('bloquea la gestión de contenido para admin o curso deshabilitado', async () => {
    mocks.model = { id: 'admin-1', role: 'admin' };
    await expect(createLink(linkForm({ contentId: 'content-1' }))).resolves.toMatchObject({ success: false });
    mocks.model = { id: 'teacher-1', role: 'docente' };
    mocks.enabled = false;
    await expect(getResourceUploadUrl('guia.pdf', 'application/pdf', { contentId: 'content-1' })).resolves.toMatchObject({ success: false });
  });

  it('autoriza subida docente sólo después de validar el padre', async () => {
    await expect(getResourceUploadUrl('guia.pdf', 'application/pdf', { contentId: 'content-1' })).resolves.toMatchObject({ success: true });
    expect(mocks.upload).toHaveBeenCalled();
    await expect(getResourceUploadUrl('guia.pdf', 'application/pdf')).resolves.toMatchObject({ success: false });
  });

  it('autoriza descarga a estudiante matriculado y la bloquea sin matrícula o habilitación', async () => {
    mocks.model = { id: 'student-1', role: 'estudiante' };
    await expect(getResourceDownloadUrl('link-1')).resolves.toEqual({ success: true, url: 'https://signed.example/file.pdf' });
    mocks.enrolled = false;
    await expect(getResourceDownloadUrl('link-1')).resolves.toMatchObject({ success: false });
    mocks.enrolled = true;
    mocks.enabled = false;
    await expect(getResourceDownloadUrl('link-1')).resolves.toMatchObject({ success: false });
  });
});
