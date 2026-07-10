import { Hono } from 'hono';
import { authMiddleware, requirePolicy } from '../middleware/auth';

const alerts = new Hono<{ Bindings: Env }>();

alerts.use('*', authMiddleware);

// GET /api/alerts
alerts.get('/', async (c) => {
  const user = c.get('user')!;

  if (user.role === 'lecturer') {
    const rows = await c.env.DB.prepare(
      `SELECT a.*, u.name AS student_name, u.email AS student_email, c.name AS course_name
       FROM alerts a
       JOIN users u ON a.student_id = u.id
       JOIN courses c ON a.course_code = c.code
       WHERE c.lecturer_id = ?
       ORDER BY a.created_at DESC`
    ).bind(user.id).all();
    return c.json({ alerts: rows.results });
  } else {
    const rows = await c.env.DB.prepare(
      `SELECT a.*, u.name AS student_name, u.email AS student_email, c.name AS course_name
       FROM alerts a
       JOIN users u ON a.student_id = u.id
       LEFT JOIN courses c ON a.course_code = c.code
       WHERE a.student_id = ?
       ORDER BY a.created_at DESC`
    ).bind(user.id).all();
    return c.json({ alerts: rows.results });
  }
});

// POST /api/alerts — create alert (lecturer)
alerts.post('/', requirePolicy('canSendAlerts'), async (c) => {
  const body = await c.req.json<{
    studentId: string; studentName: string; studentEmail: string;
    courseCode: string; courseName: string; attendanceRate: number;
    threshold: number; type?: 'email' | 'in_app' | 'both'; message: string;
    spmpLetterUrl?: string; spmpLetterName?: string;
  }>();

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO alerts (id, student_id, course_code, attendance_rate, threshold, timestamp, type, message, status, spmp_letter_url, spmp_letter_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, ?)`
  ).bind(id, body.studentId, body.courseCode, body.attendanceRate, body.threshold,
    timestamp, body.type || 'both', body.message, body.spmpLetterUrl || '', body.spmpLetterName || '').run();

  const alert = await c.env.DB.prepare('SELECT * FROM alerts WHERE id = ?').bind(id).first();
  return c.json({ alert }, 201);
});

// POST /api/alerts/send-bulk — bulk alert creation
alerts.post('/send-bulk', requirePolicy('canManageSessions'), async (c) => {
  const body = await c.req.json<{
    courseCode: string; courseName: string; threshold: number;
    messageTemplate: string; type?: 'email' | 'in_app' | 'both';
  }>();

  // Get all students enrolled in the course with their attendance rate
  // This is a simplified approach — in production you'd compute actual attendance
  const enrollments = await c.env.DB.prepare(
    `SELECT u.id, u.name, u.email FROM users u
     INNER JOIN course_enrollments ce ON u.id = ce.student_id
     INNER JOIN courses c ON ce.course_id = c.id
     WHERE c.code = ? AND u.role = 'student'`
  ).bind(body.courseCode).all<{ id: string; name: string; email: string }>();

  const createdAlerts = [];
  for (const student of (enrollments.results || [])) {
    // Total sessions conducted for this course (active or inactive — both count)
    const totalSessions = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM attendance_sessions s
       INNER JOIN courses c ON s.course_id = c.id
       WHERE c.code = ?`
    ).bind(body.courseCode).first<{ count: number }>();

    // Sessions where this student was present
    const presentCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM attendance_records ar
       INNER JOIN attendance_sessions s ON ar.session_id = s.id
       INNER JOIN courses c ON s.course_id = c.id
       WHERE c.code = ? AND ar.student_id = ? AND ar.status = 'present'`
    ).bind(body.courseCode, student.id).first<{ count: number }>();

    const total = totalSessions?.count || 0;
    const present = presentCount?.count || 0;
    const rate = total > 0 ? Math.round((present / total) * 1000) / 10 : 100;

    // Only send alert if below threshold
    if (rate >= body.threshold) continue;

    const message = body.messageTemplate
      .replace('{student_name}', student.name)
      .replace('{course_code}', body.courseCode)
      .replace('{course_name}', body.courseName)
      .replace('{attendance_rate}', String(rate))
      .replace('{threshold}', String(body.threshold));

    const alertId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO alerts (id, student_id, course_code, attendance_rate, threshold, timestamp, type, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent')`
    ).bind(alertId, student.id, body.courseCode,
      rate, body.threshold, new Date().toISOString(), body.type || 'both', message).run();

    createdAlerts.push({ id: alertId, studentName: student.name, attendanceRate: rate });
  }

  return c.json({ sent: createdAlerts.length, alerts: createdAlerts });
});

// PUT /api/alerts/:id — mark as read
alerts.put('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare("UPDATE alerts SET status = 'read' WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

export default alerts;
