import 'server-only';
import { readCourseTeachingContent } from '@/lib/course-bedel-data';
import { getVisitingTeacherAssignments, requireVisitingTeacherAssignment } from '@/lib/course-visiting-teacher-access';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { primaryExamSessionLabel, type CourseExam } from '@/lib/course-exams';
import { surveyQuestionLabels, type CourseSurvey } from '@/lib/course-surveys';
import { publicPracticeQuestions, type PracticeQuiz } from '@/lib/preparation';
import type { Review } from '@/lib/review-appointments';
import type { Course, CourseModule } from '@/types';

export async function getVisitingTeacherCourses() {
  const pb = await createServerClient();
  const assignments = await getVisitingTeacherAssignments(pb);
  if (!assignments.length) return [];
  const service = await createServiceClient();
  const courses = await Promise.all(assignments.map(({ course }) =>
    service.collection('courses').getOne<Pick<Course, 'id' | 'title' | 'status'>>(course, { fields: 'id,title,status' })));
  return courses.sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

export async function getVisitingTeacherCourse(courseId: string) {
  await requireVisitingTeacherAssignment(await createServerClient(), courseId);
  const service = await createServiceClient();
  const [content, features] = await Promise.all([
    readCourseTeachingContent(service, courseId, true),
    service.collection('courses').getOne<Course>(courseId, { fields: 'sprintsEnabled,examsEnabled,preparationEnabled,surveysEnabled' }),
  ]);
  const filter = service.filter('course = {:courseId}', { courseId });
  const [modules, quizzes, exams, surveys, reviews] = await Promise.all([
    features.sprintsEnabled ? service.collection('course_modules').getFullList<CourseModule>({ filter, sort: 'number', fields: 'id,number,title' }) : [],
    features.preparationEnabled ? service.collection('practice_quizzes').getFullList<PracticeQuiz>({ filter, sort: 'title', fields: 'id,title,description,questions' }) : [],
    features.examsEnabled ? service.collection('course_exams').getFullList<CourseExam>({ filter, sort: 'opensAt,title', fields: 'id,title,description,opensAt,questions,sessions' }) : [],
    features.surveysEnabled ? service.collection('course_surveys').getFullList<CourseSurvey>({ filter, sort: 'title', fields: 'id,title,description,questions' }) : [],
    content.course.reviewsEnabled ? service.collection('course_reviews').getFullList<Pick<Review, 'id' | 'title' | 'instructions'>>({ filter, sort: 'number', fields: 'id,title,instructions' }) : [],
  ]);

  return {
    content,
    modules,
    reviews: reviews.map(({ id, title, instructions }) => ({ id, title, description: instructions })),
    quizzes: quizzes.map(({ id, title, description, questions }) => ({ id, title, description, questions: publicPracticeQuestions(questions || []) })),
    exams: exams.map(({ id, title, description, opensAt, questions, sessions }) => ({
      id, title, description, sessions: [
        { id: 'primary', label: primaryExamSessionLabel(opensAt), questions: publicPracticeQuestions(questions || []) },
        ...(sessions || []).map(session => ({ id: session.id, label: session.label, questions: publicPracticeQuestions(session.questions || []) })),
      ],
    })),
    surveys: surveys.map(({ id, title, description, questions }) => ({
      id, title, description, questions: (questions || []).map(question => ({
        id: question.id, prompt: question.title, kind: surveyQuestionLabels[question.type], options: question.options,
      })),
    })),
  };
}
