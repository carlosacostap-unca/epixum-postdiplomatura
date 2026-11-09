import type { Assignment, Class, Delivery } from '@/types';
import { isPublicationVisible } from '@/lib/publication';
import { getStudentDeliveryState, normalizeDeliveryWorkflow, type StudentDeliveryState } from '@/lib/delivery-workflow';
import type { CourseGameConfig } from './catalog';

export interface GamePlace { id: string; name: string; title: string; href: string; date: string }
export interface GameMission { id: string; title: string; href: string; state: StudentDeliveryState | 'available'; dueDate: string }
export interface CourseGameView {
  canPresent?:boolean;
  enabledClassIds?:readonly string[];
  courseId: string;
  courseTitle: string;
  title: string;
  introduction: string;
  places: GamePlace[];
  missions: GameMission[];
  completed: number;
}

export function buildCourseGame(input: {
  courseId: string; courseTitle: string; studentId: string; config: CourseGameConfig;
  classes: Class[]; assignments: Assignment[]; deliveries: Delivery[]; now?: Date;
}): CourseGameView {
  const { courseId, courseTitle, studentId, config, now = new Date() } = input;
  const base = `/estudiantes/cursos/${encodeURIComponent(courseId)}`;
  const places = input.classes.filter(item => item.course === courseId && isPublicationVisible(item, now))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.id.localeCompare(b.id))
    .map((item, index) => ({ id: item.id, name: config.places[index] || `Rincón del valle ${index + 1}`, title: item.title, href: `${base}/clases/${encodeURIComponent(item.id)}`, date: item.date }));
  const deliveries = new Map(input.deliveries.filter(item => item.student === studentId).map(item => [item.assignment, item]));
  const missions = input.assignments.filter(item => item.course === courseId && isPublicationVisible(item, now))
    .sort((a, b) => (a.created || '').localeCompare(b.created || '') || a.id.localeCompare(b.id))
    .map((item): GameMission => {
      const delivery = deliveries.get(item.id);
      let state: GameMission['state'] = delivery ? getStudentDeliveryState(delivery) : 'available';
      if (delivery) {
        const workflow = normalizeDeliveryWorkflow(delivery);
        // An old published verdict must never complete a newer submission.
        if (workflow.status === 'published' && workflow.evaluatedVersion !== workflow.submissionVersion) state = 'resubmitted';
      }
      return { id: item.id, title: item.title, href: `${base}/tps/${encodeURIComponent(item.id)}`, state, dueDate: item.dueDate || '' };
    });
  return { enabledClassIds:config.enabledClassIds, courseId, courseTitle, title: config.title, introduction: config.introduction, places, missions, completed: missions.filter(item => item.state === 'approved').length };
}
