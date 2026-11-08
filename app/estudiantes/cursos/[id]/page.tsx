import { redirect } from "next/navigation";
import { StudentCourseOutcome } from "@/components/outcomes/StudentCourseOutcome";
import { CourseOnboardingSummary } from "@/components/onboarding/CourseOnboardingSummary";
import StudentCourseOverview from "@/components/student/StudentCourseOverview";
import { getInquiries } from "@/lib/actions-inquiries";
import { isWeekEffectivelyVisible } from "@/lib/course-weeks";
import { getAssignmentsByCourse, getClassesByCourse, getCourse, getCourseOrganizationData, getUserDelivery, isStudentEnrolled } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { canSubmitAssignment } from "@/lib/assignment-deadline";
import { getCourseGame } from "@/lib/course-game/catalog";

export const dynamic = "force-dynamic";

export default async function EstudianteCoursePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ vista?: string | string[] }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const course = await getCourse(id);
  if (!course || !(await isStudentEnrolled(course.id, user.id))) redirect("/estudiantes");
  const { vista } = (await searchParams) ?? {};
  if (vista !== 'clasica' && getCourseGame(course) && !course.teachers?.includes(user.id)) redirect(`/estudiantes/cursos/${course.id}/aventura`);

  const weekly = course.organizationMode === "semanal";
  const organization = weekly ? await getCourseOrganizationData(course) : null;
  const [classes, assignments, inquiries] = organization
    ? [organization.classes, organization.assignments, organization.inquiries]
    : await Promise.all([
        getClassesByCourse(course.id),
        getAssignmentsByCourse(course.id),
        getInquiries({ courseId: course.id, authorId: user.id, status: "Pendiente", sort: "recent" }),
      ]);
  const pendingInquiries = organization ? inquiries.filter((item) => item.author === user.id && item.status === "Pendiente") : inquiries;
  const deliveries = await Promise.all(assignments.map((assignment) => getUserDelivery(assignment.id, user.id)));
  const deliveryByAssignment = new Map(assignments.map((assignment, index) => [assignment.id, deliveries[index]]));
  const now = new Date();
  const sortedClasses = [...classes].sort((a, b) => (a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY) - (b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY));
  const nextClass = sortedClasses.find((item) => item.date && new Date(item.date) >= now);
  const pendingAssignments = assignments.filter((assignment) => !deliveryByAssignment.get(assignment.id) && canSubmitAssignment(assignment, now)).sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY) - (b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY));
  const nextAssignment = pendingAssignments[0];
  const nextClassTime = nextClass?.date ? new Date(nextClass.date).getTime() : Number.POSITIVE_INFINITY;
  const assignmentTime = nextAssignment?.dueDate ? new Date(nextAssignment.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const nextAction = nextAssignment && assignmentTime <= nextClassTime
    ? { href: `/estudiantes/cursos/${course.id}/tps/${nextAssignment.id}`, eyebrow: "Trabajo pendiente", title: nextAssignment.title, date: nextAssignment.dueDate, icon: "assignment" }
    : nextClass ? { href: `/estudiantes/cursos/${course.id}/clases/${nextClass.id}`, eyebrow: "Próxima clase", title: nextClass.title, date: nextClass.date, icon: "play_circle" } : null;

  const visibleClassIds = new Set(classes.map((item) => item.id));
  const visibleAssignmentIds = new Set(assignments.map((item) => item.id));
  const visibleInquiryIds = new Set(inquiries.map((item) => item.id));
  const visibleGroups = organization?.groups.filter((group) => isWeekEffectivelyVisible(group.week, now)).map((group) => ({
    ...group,
    classes: group.classes.filter((item) => visibleClassIds.has(item.id)),
    assignments: group.assignments.filter((item) => visibleAssignmentIds.has(item.id)),
    inquiries: group.inquiries.filter((item) => visibleInquiryIds.has(item.id)),
  })) || [];

  const activeGroup = visibleGroups.find((group) => group.assignments.some((item) => item.id === nextAssignment?.id) || group.classes.some((item) => item.id === nextClass?.id)) || visibleGroups[0];

  return <StudentCourseOverview
    course={course}
    classes={sortedClasses}
    assignments={assignments}
    pendingAssignments={pendingAssignments}
    pendingInquiries={pendingInquiries}
    deliveryByAssignment={deliveryByAssignment}
    visibleGroups={visibleGroups}
    activeGroupId={activeGroup?.week.id}
    nextClass={nextClass}
    nextAction={nextAction ? { ...nextAction, label: nextAction.eyebrow, action: nextAction.icon === "assignment" ? "Ver trabajo" : "Abrir clase" } : null}
    now={now}
    onboarding={course.onboardingEnabled ? <CourseOnboardingSummary compact courseId={course.id} /> : undefined}
    outcome={course.outcomesEnabled ? <StudentCourseOutcome courseId={course.id} /> : undefined}
  />;
}
