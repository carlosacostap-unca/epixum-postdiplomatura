import { createServerClient } from './pocketbase-server';
import { Class, Link, Assignment, User, Delivery, Course } from '@/types';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';

// Helper to create client with token for cached functions
const createClientWithToken = (token: string | undefined) => {
    const url = process.env['NEXT_PUBLIC_POCKETBASE_URL'];
    if (!url) {
        console.error("CRITICAL ERROR: NEXT_PUBLIC_POCKETBASE_URL is not set");
    }
    const pb = new PocketBase(url);
    // Disable autoCancellation to avoid issues in cached context
    pb.autoCancellation(false);
    if (token) {
        pb.authStore.loadFromCookie(`pb_auth=${token}`);
    }
    return pb;
};

// Cached fetchers using unstable_cache (Data Cache)
const getUsersCached = unstable_cache(
    async (token: string | undefined) => {
        const pb = createClientWithToken(token);
        return await pb.collection('users').getFullList<User>({
            sort: 'created',
        });
    },
    ['users-list'],
    { revalidate: 60, tags: ['users'] }
);

const getStudentsCached = unstable_cache(
    async (token: string | undefined) => {
        const pb = createClientWithToken(token);
        return await pb.collection('users').getFullList<User>({
            filter: 'role = "estudiante"',
            sort: 'name',
        });
    },
    ['students-list'],
    { revalidate: 60, tags: ['users'] }
);

// Exported functions with request memoization (React.cache)

export const getUsers = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_auth')?.value;
    return getUsersCached(token);
});

export const getStudents = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_auth')?.value;
    return getStudentsCached(token);
});

export async function getAllCourses() {
    const pb = await createServerClient();
    const records = await pb.collection('courses').getFullList<Course>({
        sort: '-created',
        expand: 'students,teachers'
    });
    return records;
}

export async function getTeacherCourses(teacherId: string) {
    const pb = await createServerClient();
    const records = await pb.collection('courses').getFullList<Course>({
        filter: `teachers ~ "${teacherId}"`,
        sort: '-created',
        expand: 'students,teachers'
    });
    return records;
}

export async function getStudentCourses(studentId: string) {
    const pb = await createServerClient();
    const records = await pb.collection('courses').getFullList<Course>({
        filter: `students ~ "${studentId}"`,
        sort: '-created',
        expand: 'teachers'
    });
    return records;
}

export async function getCourse(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('courses').getOne<Course>(id, {
      expand: 'students,teachers,classes,assignments,inquiries'
  });
  return record;
}

export async function getAllClasses() {
    const pb = await createServerClient();
    const records = await pb.collection('classes').getFullList<Class>({
        sort: '-date', // Ordenar por fecha descendente
    });
    return records;
}

export async function getClassesByCourse(courseId: string) {
    const pb = await createServerClient();
    const records = await pb.collection('classes').getFullList<Class>({
        filter: `course = "${courseId}"`,
        sort: '-date', // Ordenar por fecha descendente
    });
    return records;
}

export async function getClass(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('classes').getOne<Class>(id);
  return record;
}

export async function getAllAssignments() {
  const pb = await createServerClient();
  const records = await pb.collection('assignments').getFullList<Assignment>({
      sort: '-created', // Ordenar por creación descendente
  });
  return records;
}

export async function getAssignmentsByCourse(courseId: string) {
  try {
    const pb = await createServerClient();
    const records = await pb.collection('assignments').getFullList<Assignment>({
        filter: `course = "${courseId}"`,
        sort: 'created',
    });
    return records;
  } catch (error) {
    console.error('Error fetching assignments by course:', error);
    return [];
  }
}

export async function getAssignment(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('assignments').getOne<Assignment>(id);
  return record;
}

export async function getLinks(parentId: string, parentType: 'class' | 'assignment' = 'class') {
  const pb = await createServerClient();
  const records = await pb.collection('links').getFullList<Link>({
      filter: `${parentType} = "${parentId}"`,
      sort: 'created',
  });
  return records;
}

export async function getDeliveries(assignmentId: string) {
  const pb = await createServerClient();
  try {
     const records = await pb.collection('deliveries').getFullList<Delivery>({
         filter: `assignment = "${assignmentId}"`,
         sort: '-created',
         expand: 'student',
     });
     
     return records;
   } catch (error) {
     console.error('Error fetching deliveries:', error);
     return [];
   }
}

export async function getUserDelivery(assignmentId: string, userId: string) {
  const pb = await createServerClient();
  try {
    const record = await pb.collection('deliveries').getFirstListItem<Delivery>(
        `assignment = "${assignmentId}" && student = "${userId}"`
    );
    return record;
  } catch (error) {
    // It's normal to not have a delivery yet
    return null;
  }
}

export async function getDeliveryById(deliveryId: string) {
  const pb = await createServerClient();
  try {
    const record = await pb.collection('deliveries').getOne<Delivery>(deliveryId, {
        expand: 'student',
    });
    return record;
  } catch (error) {
    console.error('Error fetching delivery by ID:', error);
    return null;
  }
}
