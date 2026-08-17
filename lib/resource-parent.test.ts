import { describe, expect, it } from 'vitest';
import { getExclusiveResourceParent, resourceParentField } from './resource-parent';

describe('padre exclusivo de recursos', () => {
  it('acepta exactamente una clase, trabajo o contenido', () => {
    expect(getExclusiveResourceParent({ classId: 'class-1' })).toEqual({ type: 'class', id: 'class-1' });
    expect(getExclusiveResourceParent({ assignmentId: 'tp-1' })).toEqual({ type: 'assignment', id: 'tp-1' });
    expect(getExclusiveResourceParent({ contentId: 'content-1' })).toEqual({ type: 'content', id: 'content-1' });
  });

  it('rechaza ausencia y padres múltiples', () => {
    expect(getExclusiveResourceParent({})).toBeNull();
    expect(getExclusiveResourceParent({ classId: 'class-1', contentId: 'content-1' })).toBeNull();
  });

  it('convierte el discriminante al campo persistido', () => {
    expect(resourceParentField({ type: 'content', id: 'content-1' })).toBe('content');
  });
});
