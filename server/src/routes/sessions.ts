import { Hono } from 'hono';
import { authMiddleware, requirePolicy } from '../middleware/auth';

const sessions = new Hono<{ Bindings: Env }>();

// Helper: auto-transition sessions based on current week
// - Active sessions before this Monday → inactive (past week)
// - Inactive sessions within this week (Mon-Sun) → active (current week)
async function autoTransitionInactive(db: D1Database) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const mondayStr = monday.toISOString().split('T')[0];

  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  const nextMondayStr = nextMonday.toISOString().split('T')[0];

  // 1. Active sessions whose date is before this Monday → mark inactive
  await db.prepare(
    `UPDATE attendance_sessions SET status = 'inactive'
     WHERE status = 'active' AND date < ?`
  ).bind(mondayStr).run();

  // 2. Inactive sessions whose date falls within this week → mark active
  await db.prepare(
    `UPDATE attendance_sessions SET status = 'active'
     WHERE status = 'inactive' AND date >= ? AND date < ?`
  ).bind(mondayStr, nextMondayStr).run();
}

sessions.use('*', authMiddleware);

// GET /api/sessions — list sessions (JOIN courses for code/name)
sessions.get('/', async (c) => {
  const user = c.get('user')!;
  await autoTransitionInactive(c.env.DB);

  if (user.role === 'lecturer') {
    const rows = await c.env.DB.prepare(
      `SELECT s.*, c.code AS course_code, c.name AS course_name
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.lecturer_id = ?
       ORDER BY s.created_at DESC`
    ).bind(user.id).all();
    return c.json({ sessions: rows.results });
  } else {
    // Students: all sessions for enrolled courses (no class_group filter)
    const rows = await c.env.DB.prepare(
      `SELECT s.*, c.code AS course_code, c.name AS course_name
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       INNER JOIN course_enrollments ce ON s.course_id = ce.course_id
       WHERE ce.student_id = ?
       ORDER BY s.created_at DESC`
    ).bind(user.id).all();
    return c.json({ sessions: rows.results });
  }
});

// GET /api/sessions/active — active sessions for enrolled courses
sessions.get('/active', async (c) => {
  const user = c.get('user')!;
  await autoTransitionInactive(c.env.DB);

  if (user.role === 'student') {
    const rows = await c.env.DB.prepare(
      `SELECT s.*, c.code AS course_code, c.name AS course_name
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       INNER JOIN course_enrollments ce ON s.course_id = ce.course_id
       WHERE s.status = 'active' AND ce.student_id = ?
       ORDER BY s.created_at DESC`
    ).bind(user.id).all();
    return c.json({ sessions: rows.results });
  }

  const classGroup = c.req.query('classGroup') || '';
  const rows = await c.env.DB.prepare(
    `SELECT s.*, c.code AS course_code, c.name AS course_name
     FROM attendance_sessions s JOIN courses c ON s.course_id = c.id
     WHERE s.status = 'active' AND s.class_group = ?
     ORDER BY s.created_at DESC`
  ).bind(classGroup).all();
  return c.json({ sessions: rows.results });
});

// GET /api/sessions/:id
sessions.get('/:id', async (c) => {
  const id = c.req.param('id');
  const session = await c.env.DB.prepare('SELECT * FROM attendance_sessions WHERE id = ?').bind(id).first();
  if (!session) return c.json({ error: 'Session not found' }, 404);
  return c.json({ session });
});

// POST /api/sessions — create session (lecturer)
sessions.post('/', requirePolicy('canManageSessions'), async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    courseId: string; courseCode: string; courseName: string;
    classGroup: string; date: string; startTime: string; code: string;
    latitude?: number; longitude?: number; radius?: number;
    week?: number; hours?: number; deliveryMode?: 'f2f' | 'online';
  }>();

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO attendance_sessions (id, course_id, class_group, date, start_time, code, status, lecturer_id, student_count, latitude, longitude, radius, week, hours, delivery_mode)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 0, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.courseId, body.classGroup, body.date, body.startTime,
    body.code, user.id, body.latitude || null, body.longitude || null, body.radius || null,
    body.week || null, body.hours || 2, body.deliveryMode || 'f2f').run();

  const session = await c.env.DB.prepare('SELECT * FROM attendance_sessions WHERE id = ?').bind(id).first();
  return c.json({ session }, 201);
});

// POST /api/sessions/:id/checkin — student check-in
sessions.post('/:id/checkin', requirePolicy('canCheckIn'), async (c) => {
  const user = c.get('user')!;
  const sessionId = c.req.param('id');
  const body = await c.req.json<{
    latitude?: number; longitude?: number; distanceToCenter?: number;
    inGeofence?: boolean; evidenceType?: string; evidenceNotes?: string;
  }>();

  const session = await c.env.DB.prepare(
    'SELECT * FROM attendance_sessions WHERE id = ? AND status = ?'
  ).bind(sessionId, 'active').first<{ id: string; course_id: string; course_code: string; course_name: string; class_group: string }>();

  if (!session) {
    return c.json({ error: 'Session not found or not active' }, 404);
  }

  // Check if already checked in
  const existing = await c.env.DB.prepare(
    'SELECT * FROM attendance_records WHERE session_id = ? AND student_id = ?'
  ).bind(sessionId, user.id).first();

  if (existing) {
    return c.json({ error: 'Already checked in for this session' }, 409);
  }

  // Get student details
  const student = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first<{
    name: string; matric_no: string; class_group: string;
  }>();

  if (!student) return c.json({ error: 'Student not found' }, 404);

  const recordId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO attendance_records (id, session_id, student_id, timestamp, status, latitude, longitude, distance_to_center, in_geofence, evidence_type, evidence_notes, approval_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(recordId, sessionId, user.id,
    timestamp, body.inGeofence ? 'present' : 'bermasalah',
    body.latitude || null, body.longitude || null, body.distanceToCenter || null,
    body.inGeofence ? 1 : 0, body.evidenceType || '', body.evidenceNotes || '',
    body.inGeofence ? 'none' : 'pending').run();

  // Update session student count
  await c.env.DB.prepare(
    'UPDATE attendance_sessions SET student_count = student_count + 1 WHERE id = ?'
  ).bind(sessionId).run();

  const record = await c.env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?').bind(recordId).first();
  return c.json({ record }, 201);
});

// PUT /api/sessions/:id — update session (date, etc.)
sessions.put('/:id', requirePolicy('canManageSessions'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ date?: string; }>();

  if (body.date) {
    await c.env.DB.prepare('UPDATE attendance_sessions SET date = ? WHERE id = ?').bind(body.date, id).run();
  }

  const session = await c.env.DB.prepare(
    `SELECT s.*, c.code AS course_code, c.name AS course_name
     FROM attendance_sessions s JOIN courses c ON s.course_id = c.id WHERE s.id = ?`
  ).bind(id).first();
  return c.json({ session });
});

// GET /api/sessions/:id/students — enrolled students for the session's course
sessions.get('/:id/students', requirePolicy('canManageSessions'), async (c) => {
  const id = c.req.param('id');
  const session = await c.env.DB.prepare('SELECT course_id, class_group FROM attendance_sessions WHERE id = ?').bind(id).first<{
    course_id: string; class_group: string;
  }>();
  if (!session) return c.json({ error: 'Session not found' }, 404);

  // Get enrolled students for this course matching the class group
  const students = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email, u.matric_no, u.class_group,
     COALESCE(ar.status, 'absent') AS record_status, ar.id AS record_id
     FROM users u
     INNER JOIN course_enrollments ce ON u.id = ce.student_id
     LEFT JOIN attendance_records ar ON ar.session_id = ? AND ar.student_id = u.id
     WHERE ce.course_id = ? AND u.class_group = ?
     ORDER BY u.name`
  ).bind(id, session.course_id, session.class_group).all();
  return c.json({ students: students.results });
});

// POST /api/sessions/:id/bulk-attendance — mark multiple students (absent→present)
sessions.post('/:id/bulk-attendance', requirePolicy('canManageSessions'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ studentIds: string[] }>();

  const session = await c.env.DB.prepare('SELECT id FROM attendance_sessions WHERE id = ?').bind(id).first();
  if (!session) return c.json({ error: 'Session not found' }, 404);

  const timestamp = new Date().toISOString();
  let count = 0;

  for (const studentId of body.studentIds) {
    // Check if record already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?'
    ).bind(id, studentId).first();

    if (!existing) {
      const student = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(studentId).first();
      if (student) {
        await c.env.DB.prepare(
          `INSERT INTO attendance_records (id, session_id, student_id, timestamp, status, approval_status)
           VALUES (?, ?, ?, ?, 'present', 'none')`
        ).bind(crypto.randomUUID(), id, studentId, timestamp).run();
        count++;
      }
    }
  }

  // Update student count
  if (count > 0) {
    await c.env.DB.prepare(
      'UPDATE attendance_sessions SET student_count = student_count + ? WHERE id = ?'
    ).bind(count, id).run();
  }

  return c.json({ created: count });
});

export default sessions;
