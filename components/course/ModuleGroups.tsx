import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Assignment, CourseModule, CourseWeek } from '@/types';

interface Props<T> {
  modules?: CourseModule[];
  groups: T[];
  includeEmpty?: boolean;
  assignmentHref?: (id: string) => string;
  render: (group: T, index: number) => ReactNode;
}

export function ModuleGroups<T extends { week: CourseWeek; assignments: Assignment[] }>({ modules, groups, includeEmpty, assignmentHref, render }: Props<T>) {
  if (!modules) return groups.map(render);
  const sections = modules.map(module => ({
    id: module.id,
    heading: `Módulo ${module.number} · ${module.title}`,
    assignment: groups.flatMap(group => group.assignments).find(item => item.id === module.assignment),
    groups: groups.filter(group => group.week.module === module.id),
  }));
  const unassigned = groups.filter(group => !modules.some(module => module.id === group.week.module));
  if (unassigned.length) sections.push({ id: 'unassigned', heading: 'Sprints por organizar', assignment: undefined, groups: unassigned });
  return sections.filter(section => includeEmpty || section.groups.length).map(section => (
    <section key={section.id} className="space-y-3">
      <h3 className="font-headline text-xl font-bold">{section.heading}</h3>
      {section.assignment && assignmentHref && <p className="text-sm">Entrega acreditable · <Link className="underline" href={assignmentHref(section.assignment.id)}>{section.assignment.title}</Link></p>}
      {section.groups.map(group => render(group, groups.indexOf(group)))}
    </section>
  ));
}
