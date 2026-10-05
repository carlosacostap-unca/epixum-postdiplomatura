export type AttendanceStatus = 'present' | 'absent';
export type AttendanceDisplay = AttendanceStatus | 'pending' | 'untracked' | 'not-applicable';
export interface AttendanceSession {
  id: string; class: string; classTitle: string; attendanceEnabled?: boolean;
  status: 'live' | 'closed'; created: string; closedAt: string;
}
export interface AttendanceEntry { session: string; student: string; created: string }
export interface AttendanceAdjustment {
  id: string; class: string; student: string; status: AttendanceStatus;
  actor: string; actorName: string; created: string;
}
export interface AttendanceStudent { id: string; name: string; email: string; enrolledAt: string | null }
export interface AttendanceClass { id: string; title: string; date: string }
export interface AttendanceCell {
  status: AttendanceDisplay; firstJoinedAt: string | null; editable: boolean;
  corrections: AttendanceAdjustment[];
}
export interface AttendanceReport {
  classes: (AttendanceClass & { phase: 'live' | 'closed' | 'pending' | 'untracked' })[];
  rows: { student: AttendanceStudent; cells: Record<string, AttendanceCell> }[];
}
export const attendanceLabels: Record<AttendanceDisplay, string> = {
  present: 'Presente', absent: 'Ausente', pending: 'Pendiente', untracked: 'Sin registro', 'not-applicable': 'No corresponde',
};

export function buildAttendanceReport(classes: AttendanceClass[], students: AttendanceStudent[], sessions: AttendanceSession[], entries: AttendanceEntry[], adjustments: AttendanceAdjustment[]): AttendanceReport {
  const classSessions = new Map<string, AttendanceSession[]>();
  for (const session of sessions) classSessions.set(session.class, [...(classSessions.get(session.class) || []), session]);
  const trackedSessions = new Map(sessions.filter(s => s.attendanceEnabled).map(s => [s.id, s]));
  const firstJoins = new Map<string, string>();
  for (const entry of entries) {
    const session = trackedSessions.get(entry.session);
    if (!session || (session.closedAt && Date.parse(entry.created) > Date.parse(session.closedAt))) continue;
    const key = `${session.class}:${entry.student}`;
    const previous = firstJoins.get(key);
    if (!previous || Date.parse(entry.created) < Date.parse(previous)) firstJoins.set(key, entry.created);
  }
  const corrections = new Map<string, AttendanceAdjustment[]>();
  // Server timestamps, then IDs for deterministic ordering of simultaneous changes.
  for (const adjustment of [...adjustments].sort((a, b) => Date.parse(b.created) - Date.parse(a.created) || b.id.localeCompare(a.id))) {
    const key = `${adjustment.class}:${adjustment.student}`;
    corrections.set(key, [...(corrections.get(key) || []), adjustment]);
  }
  const columns = classes.map(cls => {
    const all = classSessions.get(cls.id) || [];
    const tracked = all.filter(s => s.attendanceEnabled);
    const phase = tracked.some(s => s.status === 'live') ? 'live' : tracked.length ? 'closed' : all.length ? 'untracked' : 'pending';
    return { ...cls, phase } as AttendanceReport['classes'][number];
  });
  return { classes: columns, rows: students.map(student => ({ student, cells: Object.fromEntries(columns.map(cls => {
    const tracked = (classSessions.get(cls.id) || []).filter(s => s.attendanceEnabled);
    const history = corrections.get(`${cls.id}:${student.id}`) || [];
    const firstJoinedAt = firstJoins.get(`${cls.id}:${student.id}`) || null;
    const lastClosedAt = Math.max(0, ...tracked.map(s => Date.parse(s.closedAt) || 0));
    const applicable = student.enrolledAt !== null && (!student.enrolledAt || cls.phase === 'live' || Date.parse(student.enrolledAt) <= lastClosedAt);
    const status: AttendanceDisplay = history[0]?.status || (firstJoinedAt ? 'present' : cls.phase === 'pending' ? 'pending' : cls.phase === 'untracked' ? 'untracked' : !applicable ? 'not-applicable' : cls.phase === 'live' ? 'pending' : 'absent');
    return [cls.id, { status, firstJoinedAt, corrections: history, editable: tracked.length > 0 && (applicable || Boolean(firstJoinedAt) || history.length > 0) } satisfies AttendanceCell];
  })) })) };
}
