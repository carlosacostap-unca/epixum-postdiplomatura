import 'server-only';
import type PocketBase from 'pocketbase';
import type { Course, User } from '@/types';
import { buildAttendanceReport, type AttendanceAdjustment, type AttendanceClass, type AttendanceEntry, type AttendanceSession, type AttendanceStudent } from './course-attendance';

export class AttendanceAccessError extends Error {}
export async function requireAttendanceManager(pb: PocketBase, courseId: string) {
  const user = pb.authStore.record as unknown as User | null;
  if (!pb.authStore.isValid || !user?.id) throw new AttendanceAccessError('Iniciá sesión para continuar.');
  const course = await pb.collection('courses').getOne<Course>(courseId).catch(error => {
    if (error?.status === 404) throw new AttendanceAccessError('El curso no está disponible.');
    throw error;
  });
  if (!course.interactiveClassesEnabled || (user.role !== 'admin' && !course.teachers?.includes(user.id))) {
    throw new AttendanceAccessError('No tenés acceso a la asistencia de este curso.');
  }
  return { course, user };
}

// Caller must authorize the course before obtaining the privileged client.
export async function readAttendanceReport(service: PocketBase, courseId: string) {
  const filter = service.filter('course = {:course}', { course: courseId });
  const [sessions, adjustments, enrollments, lessons, classes] = await Promise.all([
    service.collection('interactive_sessions').getFullList<AttendanceSession>({ filter, fields: 'id,class,classTitle,attendanceEnabled,status,created,closedAt' }),
    service.collection('course_attendance_adjustments').getFullList<AttendanceAdjustment>({ filter, fields: 'id,class,student,status,actor,actorName,created' }),
    service.collection('course_enrollments').getFullList<{ student: string; created: string }>({ filter, fields: 'student,created' }),
    service.collection('interactive_lessons').getFullList<{ class: string }>({ filter, fields: 'class' }),
    service.collection('classes').getFullList<AttendanceClass>({ filter, fields: 'id,title,date', sort: 'date,created,id' }),
  ]);
  const entries = await service.collection('interactive_participants').getFullList<AttendanceEntry>({
    filter: service.filter('session.course = {:course} && session.attendanceEnabled = true', { course: courseId }), fields: 'session,student,created',
  });
  const studentIds = [...new Set([...enrollments.map(e => e.student), ...entries.map(e => e.student), ...adjustments.map(e => e.student)])];
  const students: AttendanceStudent[] = [];
  for (let i = 0; i < studentIds.length; i += 40) {
    const users = await service.collection('users').getFullList<Pick<User, 'id' | 'name' | 'email' | 'firstName' | 'lastName'>>({
      filter: studentIds.slice(i, i + 40).map(id => service.filter('id = {:id}', { id })).join(' || '), fields: 'id,name,email,firstName,lastName',
    });
    students.push(...users.map(user => {
      const memberships = enrollments.filter(e => e.student === user.id);
      return { id: user.id, name: [user.lastName, user.firstName].filter(Boolean).join(', ') || user.name || user.email,
        email: user.email, enrolledAt: memberships.length ? memberships.map(e => e.created || '').sort()[0] : null };
    }));
  }
  students.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const classIds = new Set([...lessons.map(l => l.class), ...sessions.map(s => s.class), ...adjustments.map(a => a.class)]);
  return buildAttendanceReport(classes.filter(cls => classIds.has(cls.id)), students, sessions, entries, adjustments);
}
