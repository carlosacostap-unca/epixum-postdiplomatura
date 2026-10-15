import { describe, expect, it } from 'vitest';
import { canSubmitAssignment, createDeadlineSnapshot, deliveryTiming, isAfterDeadline, lateSubmissionsFromForm, parseDeadlineSnapshot } from './assignment-deadline';

const dueDate = '2026-10-15T19:00:00.000Z';
describe('política de entregas fuera de término', () => {
  it('conserva cierre estricto por defecto, igualdad permitida y compara instantes con zona horaria', () => {
    expect(canSubmitAssignment({ dueDate }, dueDate)).toBe(true);
    expect(canSubmitAssignment({ dueDate }, '2026-10-15T19:00:00.001Z')).toBe(false);
    expect(isAfterDeadline(dueDate, '2026-10-15T16:00:00-03:00')).toBe(false);
    expect(canSubmitAssignment({ dueDate, allowLateSubmissions: true }, '2026-10-16T10:00:00Z')).toBe(true);
    expect(canSubmitAssignment({}, '2026-10-16T10:00:00Z')).toBe(true);
  });
  it('conserva el vencimiento original aunque después se extienda y admite sin plazo', () => {
    const deadlineSnapshot = createDeadlineSnapshot(dueDate, '2026-10-16T10:00:00Z');
    expect(deliveryTiming({ submittedAt: '2026-10-16T10:00:00Z', deadlineSnapshot }, '2026-11-01')).toEqual({ dueDate, late: true, recorded: true });
    expect(createDeadlineSnapshot(undefined, dueDate)).toEqual({ dueDate: null, late: false });
    expect(deliveryTiming({ submittedAt: dueDate, deadlineSnapshot: { dueDate: null, late: false } }, '2020-01-01').late).toBe(false);
  });
  it('distingue datos heredados y no inventa una marca desde fechas inválidas', () => {
    expect(deliveryTiming({ created: '2026-10-16T10:00:00Z' }, dueDate)).toMatchObject({ late: true, recorded: false });
    expect(deliveryTiming({ submittedAt: 'inválido' }, dueDate).late).toBe(false);
    expect(parseDeadlineSnapshot({ dueDate: null, late: true })).toBeUndefined();
    expect(parseDeadlineSnapshot({ dueDate: 'inválido', late: true })).toBeUndefined();
  });
  it.each([['on', true], ['true', true], ['1', true], ['false', false], ['', false]])('lee casilla %s de forma explícita', (value, expected) => {
    const form = new FormData(); form.set('allowLateSubmissions', value);
    expect(lateSubmissionsFromForm(form)).toBe(expected);
  });
});
