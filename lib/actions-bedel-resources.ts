'use server';

import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { requireBedelAssignment } from '@/lib/course-bedel-access';
import { getExclusiveResourceParent } from '@/lib/resource-parent';
import { getPresignedDownloadUrl } from '@/lib/s3';
import type { Link } from '@/types';

export async function getBedelResourceDownloadUrl(courseId: string, linkId: string) {
  try {
    const pb = await createServerClient();
    await requireBedelAssignment(pb, courseId);
    const service = await createServiceClient();
    const link = await service.collection('links').getOne<Link>(linkId, { fields: 'id,url,type,class,assignment,content' });
    const parent = getExclusiveResourceParent({ classId: link.class, assignmentId: link.assignment, contentId: link.content });
    if (!parent) throw new Error('Recurso inválido.');
    const collection = parent.type === 'class' ? 'classes' : parent.type === 'assignment' ? 'assignments' : 'course_contents';
    const record = await service.collection(collection).getOne(parent.id, { fields: 'course' });
    if (record.course !== courseId) throw new Error('Recurso de otro curso.');
    if (parent.type === 'content') {
      const course = await service.collection('courses').getOne(courseId, { fields: 'contentsEnabled' });
      if (!course.contentsEnabled) throw new Error('Contenido deshabilitado.');
    }
    if (link.type !== 'file' && !link.url.includes('idrivee2.com') && !link.url.includes('epixum-javascript-storage')) {
      throw new Error('El recurso no es un archivo.');
    }
    const key = /^https?:\/\//i.test(link.url) ? decodeURIComponent(new URL(link.url).pathname.split('/').pop() || '') : link.url;
    if (!key) throw new Error('Archivo inválido.');
    return { success: true, url: await getPresignedDownloadUrl(key) };
  } catch {
    return { success: false, error: 'No pudimos abrir el archivo. Verificá que sigas asignado al curso e intentá nuevamente.' };
  }
}
