import { describe, expect, it } from 'vitest';
import { liveCommandSchema, publicScreen, safeInteractiveReturn, validateLiveAnswer } from './live-interactive-contract';

describe('contrato de clases en vivo', () => {
  const screen = { id: 'a', title: 'Pregunta', body: '', type: 'multiple-choice' as const, options: [{ id: 'yes', label: 'Sí' }, { id: 'no', label: 'No' }], correctOptionId: 'yes', explanation: 'Privada' };
  it('retira soluciones y campos desconocidos', () => {
    const published = publicScreen({ ...screen, secret: 'no publicar' } as typeof screen);
    expect(published).toEqual({ id: 'a', title: 'Pregunta', body: '', type: 'multiple-choice', options: screen.options });
    expect(published).not.toHaveProperty('explanation');
  });
  it('valida opciones y texto según la pantalla', () => {
    expect(validateLiveAnswer(publicScreen(screen), ' yes ')).toBe('yes');
    expect(() => validateLiveAnswer(publicScreen(screen), 'otro')).toThrow();
    const short = { id: 'b', title: 'Texto', body: '', type: 'short-answer' as const, maxLength: 3 };
    expect(() => validateLiveAnswer(short, 'abcd')).toThrow();
    expect(() => validateLiveAnswer(short, '   ')).toThrow();
    expect(() => validateLiveAnswer({ ...short, type: 'content' }, 'a')).toThrow();
  });
  it('exige revisiones y rechaza comandos extra', () => {
    expect(liveCommandSchema.safeParse({ kind: 'finish' }).success).toBe(false);
    expect(liveCommandSchema.safeParse({ kind: 'screen', revision: 'a'.repeat(24), index: 80 }).success).toBe(false);
    expect(liveCommandSchema.safeParse({ kind: 'heartbeat', student: 'otro' }).success).toBe(false);
  });
  it.each(['https://other.test', '//other.test', '/\\other.test', '/interactivas?codigo=A1B2C3D4&next=https://other.test', '/interactivas/%2f%2fother', '/admin', '/interactivas\n'])('rechaza retorno %s', (value) => expect(safeInteractiveReturn(value)).toBeNull());
  it.each(['/interactivas', '/interactivas?codigo=A1B2C3D4', '/interactivas/sesion/123456789abcdef'])('permite retorno %s', (value) => expect(safeInteractiveReturn(value)).toBe(value));
});
