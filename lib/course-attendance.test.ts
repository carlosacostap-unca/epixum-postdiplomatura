import { describe, expect, it } from 'vitest';
import { buildAttendanceReport, type AttendanceAdjustment, type AttendanceSession } from './course-attendance';
const classes = [{ id: 'class', title: 'Clase 1', date: '' }, { id: 'future', title: 'Clase 2', date: '' }];
const students = [{ id: 'student', name: 'Alumno Prueba', email: 'alumno@example.com', enrolledAt: '2026-10-01T00:00:00Z' }];
const session: AttendanceSession = { id: 'live', class: 'class', classTitle: 'Clase 1', attendanceEnabled: true, status: 'live', created: '2026-10-05T12:00:00Z', closedAt: '' };
const join = { session: 'live', student: 'student', created: '2026-10-05T12:10:00Z' };
const closed = { ...session, status: 'closed' as const, closedAt: '2026-10-05T13:00:00Z' };
const adjustment: AttendanceAdjustment = { id: 'a', class: 'class', student: 'student', status: 'absent', actor: 'teacher', actorName: 'Docente Prueba', created: '2026-10-05T12:15:00Z' };
const report = (sessions = [session], entries = [join], corrections: AttendanceAdjustment[] = [], roster = students) => buildAttendanceReport(classes, roster, sessions, entries, corrections);
describe('planilla de asistencia', () => {
  it('cuenta presente una sola vez por clase y conserva el primer ingreso entre varias sesiones', () => {
    const result = report([session, { ...session, id: 'second' }], [join, { ...join, session: 'second', created: '2026-10-05T12:20:00Z' }, join]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cells.class).toMatchObject({ status: 'present', firstJoinedAt: join.created, editable: true });
    expect(result.rows[0].cells.future).toMatchObject({ status: 'pending', editable: false });
  });
  it('solo determina ausente cuando todas las sesiones con seguimiento finalizaron', () => {
    expect(report([session], []).rows[0].cells.class.status).toBe('pending');
    expect(report([closed], []).rows[0].cells.class.status).toBe('absent');
    expect(report([closed, { ...session, id: 'second' }], []).rows[0].cells.class.status).toBe('pending');
  });
  it('no convierte registros antiguos ni ingresos posteriores al cierre en presentes', () => {
    expect(report([{ ...closed, attendanceEnabled: false }]).rows[0].cells.class).toMatchObject({ status: 'untracked', editable: false, firstJoinedAt: null });
    expect(report([closed], [{ ...join, created: '2026-10-06T12:00:00Z' }]).rows[0].cells.class.status).toBe('absent');
  });
  it('conserva la última corrección frente a reingresos y mantiene todo el historial', () => {
    const first = { ...adjustment, id: 'b', status: 'present' as const, created: '2026-10-05T12:00:00Z' };
    const cell = report([session], [join, { ...join, created: '2026-10-05T12:30:00Z' }], [first, adjustment]).rows[0].cells.class;
    expect(cell.status).toBe('absent');
    expect(cell.corrections).toEqual([adjustment, first]);
    expect(cell.firstJoinedAt).toBe(join.created);
  });
  it('no imputa ausencias previas a la matrícula y conserva presencia de alumnos retirados', () => {
    expect(report([closed], [], [], [{ ...students[0], enrolledAt: '' }]).rows[0].cells.class.status).toBe('absent');
    expect(report([closed], [], [], [{ ...students[0], enrolledAt: '2026-10-06T00:00:00Z' }]).rows[0].cells.class).toMatchObject({ status: 'not-applicable', editable: false });
    const retired = buildAttendanceReport(classes, [{ ...students[0], enrolledAt: null }], [closed], [join], []);
    expect(retired.rows[0].cells.class).toMatchObject({ status: 'present', editable: true });
  });
  it('no mezcla clases, alumnos ni ingresos sin seguimiento', () => {
    const result = report([session], [{ ...join, student: 'other' }, { ...join, session: 'not-tracked' }], [{ ...adjustment, student: 'other' }]);
    expect(result.rows[0].cells.class.status).toBe('pending');
    expect(result.rows[0].cells.class.corrections).toEqual([]);
  });
});
