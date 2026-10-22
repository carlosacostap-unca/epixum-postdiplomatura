import { describe, expect, it } from 'vitest';
import { gradePractice, orderPracticeQuestions, practiceGrade, practiceQuizSchema, type PracticeQuestion } from './preparation';

const bank: PracticeQuestion[] = Array.from({ length: 20 }, (_, i) => ({ id: `q${i + 1}`, prompt: `Pregunta ${i + 1}`, options: ['a', 'b', 'c', 'd'].map(id => ({ id, label: `Opción ${id}` })), correctOptionId: 'b', explanation: `Explicación ${i + 1}` }));

describe('parcial con banco fijo y orden aleatorio', () => {
  it('cambia la presentación conservando las mismas 20 preguntas, opciones y claves', () => {
    const original = JSON.stringify(bank);
    const first = orderPracticeQuestions(bank, true, true, () => 0);
    const second = orderPracticeQuestions(bank, true, true, limit => limit - 1);
    expect(first.map(q => q.id)).not.toEqual(second.map(q => q.id));
    expect(first[0].options.map(o => o.id)).not.toEqual(second[0].options.map(o => o.id));
    for (const output of [first, second]) {
      expect(output.map(q => q.id).sort()).toEqual(bank.map(q => q.id).sort());
      for (const q of output) {
        expect(q.options.map(o => o.id).sort()).toEqual(['a', 'b', 'c', 'd']);
        expect(q.correctOptionId).toBe('b');
        expect(q.options.find(o => o.id === q.correctOptionId)?.label).toBe('Opción b');
      }
      expect(gradePractice(output, Object.fromEntries(bank.map(q => [q.id, 'b']))).correct).toBe(20);
    }
    expect(JSON.stringify(bank)).toBe(original);
  });
  it('califica por identificador: cada acierto suma exactamente 0,5 y errores no restan', () => {
    const shuffled = orderPracticeQuestions(bank, true, true, () => 0);
    for (let correct = 0; correct <= 20; correct++) {
      const selected = Object.fromEntries(bank.map((q, i) => [q.id, i < correct ? 'b' : 'a']));
      const result = gradePractice(shuffled, selected);
      expect(practiceGrade(result.correct, result.total)).toBe(correct * 0.5);
      const partial = Object.fromEntries(bank.slice(0, correct).map(q => [q.id, 'b']));
      const omitted = gradePractice(shuffled, partial);
      expect(practiceGrade(omitted.correct, omitted.total)).toBe(correct * 0.5);
    }
  });
  it('conserva la presentación de prácticas anteriores y permite mezclar sólo opciones', () => {
    const draw = () => 0;
    expect(orderPracticeQuestions(bank, false, false, draw)).toEqual(bank);
    const optionsOnly = orderPracticeQuestions(bank, false, true, draw);
    expect(optionsOnly.map(q => q.id)).toEqual(bank.map(q => q.id));
    expect(optionsOnly[0].options).not.toEqual(bank[0].options);
    const parsed = practiceQuizSchema.parse({ title: 'Anterior', status: 'published', questions: bank });
    expect(parsed.shuffleQuestions).toBe(false); expect(parsed.shuffleOptions).toBe(false);
    expect(practiceQuizSchema.safeParse({ ...parsed, shuffleQuestions: 'true' }).success).toBe(false);
  });
});
