export type ResourceParentType = 'class' | 'assignment' | 'content';

export type ResourceParent = {
  type: ResourceParentType;
  id: string;
};

export function getExclusiveResourceParent(values: {
  classId?: unknown;
  assignmentId?: unknown;
  contentId?: unknown;
}): ResourceParent | null {
  const candidates: ResourceParent[] = [
    { type: 'class' as const, id: typeof values.classId === 'string' ? values.classId.trim() : '' },
    { type: 'assignment' as const, id: typeof values.assignmentId === 'string' ? values.assignmentId.trim() : '' },
    { type: 'content' as const, id: typeof values.contentId === 'string' ? values.contentId.trim() : '' },
  ].filter((candidate) => Boolean(candidate.id));
  return candidates.length === 1 ? candidates[0] : null;
}

export function resourceParentField(parent: ResourceParent) {
  return parent.type === 'class' ? 'class' : parent.type === 'assignment' ? 'assignment' : 'content';
}
