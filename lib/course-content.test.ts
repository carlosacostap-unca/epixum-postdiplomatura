import { describe, expect, it } from 'vitest';
import { isCompleteCourseContentOrder, normalizeCourseContentTitle, sortCourseContents } from './course-content';

describe('auxiliares de contenidos', () => {
  it('normaliza y valida títulos', () => {
    expect(normalizeCourseContentTitle('  Introducción  ')).toBe('Introducción');
    expect(() => normalizeCourseContentTitle('   ')).toThrow('obligatorio');
    expect(() => normalizeCourseContentTitle('x'.repeat(161))).toThrow('160');
  });

  it('ordena por posición y desempata de forma estable', () => {
    const items = [
      { id: 'b', position: 1 },
      { id: 'c', position: 0 },
      { id: 'a', position: 1 },
    ];
    expect(sortCourseContents(items).map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('acepta solamente una permutación completa sin duplicados', () => {
    expect(isCompleteCourseContentOrder(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(isCompleteCourseContentOrder(['a', 'b'], ['a'])).toBe(false);
    expect(isCompleteCourseContentOrder(['a', 'b'], ['a', 'a'])).toBe(false);
    expect(isCompleteCourseContentOrder(['a', 'b'], ['a', 'c'])).toBe(false);
  });
});
