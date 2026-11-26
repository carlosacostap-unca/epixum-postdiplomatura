import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assignment: vi.fn(), visitingAssignment: vi.fn(), service: vi.fn(), sign: vi.fn(),
  parentCourse: 'course-a', contentsEnabled: true,
  link: { id: 'link', type: 'file', url: 'https://storage.example/bucket/gu%C3%ADa.pdf', class: 'class-a', assignment: '', content: '', audience: '' },
}));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({}) }));
vi.mock('./course-bedel-access', () => ({ requireBedelAssignment: mocks.assignment }));
vi.mock('./course-visiting-teacher-access', () => ({ requireVisitingTeacherAssignment: mocks.visitingAssignment }));
vi.mock('./s3', () => ({ getPresignedDownloadUrl: mocks.sign }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: async () => {
  mocks.service(); return { collection: (name: string) => ({ getOne: async () => {
    if (name === 'links') return mocks.link;
    if (name === 'courses') return { contentsEnabled: mocks.contentsEnabled };
    return { course: mocks.parentCourse };
  } }) };
} }));

import { getBedelResourceDownloadUrl, getVisitingTeacherResourceDownloadUrl } from './actions-bedel-resources';

describe('descargas de bedel', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.assignment.mockResolvedValue({ id: 'assignment' }); mocks.sign.mockResolvedValue('https://signed.example/guia');
    mocks.visitingAssignment.mockResolvedValue(undefined);
    mocks.parentCourse = 'course-a'; mocks.contentsEnabled = true;
    mocks.link = { id: 'link', type: 'file', url: 'https://storage.example/bucket/gu%C3%ADa.pdf', class: 'class-a', assignment: '', content: '', audience: '' };
  });
  it('autoriza el curso y firma únicamente el archivo guardado de ese curso', async () => {
    expect(await getBedelResourceDownloadUrl('course-a', 'link')).toEqual({ success: true, url: 'https://signed.example/guia' });
    expect(mocks.assignment).toHaveBeenCalledWith({}, 'course-a');
    expect(mocks.sign).toHaveBeenCalledWith('guía.pdf');
  });
  it('una asignación revocada no llega al cliente privilegiado ni firma URLs', async () => {
    mocks.assignment.mockRejectedValue({ status: 404 });
    expect(await getBedelResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    expect(mocks.service).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled();
  });
  it('permite al docente visitante descargar material docente de su curso y comprueba su asignación', async () => {
    mocks.link.audience = 'teachers';
    expect(await getBedelResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    expect(await getVisitingTeacherResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: true });
    expect(mocks.visitingAssignment).toHaveBeenCalledWith({}, 'course-a');
    mocks.parentCourse = 'course-b';
    expect(await getVisitingTeacherResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    mocks.visitingAssignment.mockRejectedValue({ status: 404 });
    expect(await getVisitingTeacherResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    expect(mocks.sign).toHaveBeenCalledTimes(1);
  });
  it('rechaza recursos ajenos, ambiguos, deshabilitados y enlaces externos', async () => {
    mocks.parentCourse = 'course-b';
    expect(await getBedelResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    mocks.parentCourse = 'course-a'; mocks.link.assignment = 'assignment-a';
    expect(await getBedelResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    mocks.link.assignment = ''; mocks.link.class = ''; mocks.link.content = 'content-a'; mocks.contentsEnabled = false;
    expect(await getBedelResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    mocks.contentsEnabled = true; mocks.link.type = 'link';
    expect(await getBedelResourceDownloadUrl('course-a', 'link')).toMatchObject({ success: false });
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
