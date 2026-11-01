import { describe, expect, it } from 'vitest';
import { criticalThinkingSurveys } from '../scripts/critical-thinking-surveys.mjs';
import { parseSurveyAnswers, surveyDesignSchema } from './course-surveys';

describe('cuestionarios de Pensamiento Crítico', () => {
  it('ofrece dos diseños válidos, anónimos, opcionales y con seis preguntas comparables', () => {
    const templates = criticalThinkingSurveys();
    const designs = templates.map(template => surveyDesignSchema.parse(template.design));
    expect(designs.map(design => design.audience)).toEqual(['approved', 'not_approved_or_incomplete']);
    expect(designs[0].questions.slice(0, 6)).toEqual(designs[1].questions.slice(0, 6));
    expect(designs[0].questions.slice(6)).not.toEqual(designs[1].questions.slice(6));
    for (const design of designs) {
      expect(design.anonymous).toBe(true); expect(design.closesAt).toBe(''); expect(design.questions).toHaveLength(10);
      expect(design.questions.every(question => !question.required)).toBe(true);
      expect(() => parseSurveyAnswers(design.questions, {})).toThrow('al menos una');
      expect(parseSurveyAnswers(design.questions, { claridad: 'o5' })).toEqual({ claridad: 'o5' });
      expect(design.description).toContain('no modifican tu resultado');
    }
  });
});
