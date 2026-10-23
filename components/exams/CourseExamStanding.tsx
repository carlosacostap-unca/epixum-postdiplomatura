import { Badge } from '@/components/ui';
import { courseExamOutcome } from '@/lib/course-exam-grading';

export function CourseExamStanding({ correct, total }: { correct?: number | null; total?: number | null }) {
  const outcome = courseExamOutcome(correct, total);
  if (!outcome) return null;
  return <div className="space-y-1" aria-label="Condición del parcial"><Badge tone={outcome.approved ? 'success' : 'error'}>{outcome.label}</Badge>{outcome.condition && <p className="text-sm">{outcome.condition}</p>}</div>;
}
