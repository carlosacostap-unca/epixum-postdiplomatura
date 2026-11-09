import type { Course } from '@/types';

export interface CourseGameConfig {
  enabledClassIds?: readonly string[];
  presenterId?:string;
  title: string;
  introduction: string;
  places: readonly string[];
}

// Opt-in by stable course ID. Removing an entry disables both route and navigation.
const games: Readonly<Record<string, CourseGameConfig>> = {
  '5wdbs1o1p22vszm': {
    enabledClassIds:['cf8xxh363j2pglb'],
    presenterId:'jz8xc7htg1ra6wr',
    title: 'Valle de las Ideas',
    introduction: 'Tu aventura en el Nodo Tecnológico Catamarca. Entrá al edificio para descubrir todos los encuentros y hacer florecer tus ideas.',
    places: Array.from({ length: 8 }, () => 'Nodo Tecnológico Catamarca'),
  },
};

export function getCourseGame(course: Pick<Course, 'id' | 'organizationMode' | 'status'>): CourseGameConfig | null {
  // Visibility is authorized by PocketBase and authorizeCourseGame, including invited students.
  if (course.organizationMode === 'semanal') return null;
  return Object.hasOwn(games, course.id) ? games[course.id] : null;
}
