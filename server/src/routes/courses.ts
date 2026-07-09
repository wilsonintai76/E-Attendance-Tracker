import { Hono } from 'hono';
import { authMiddleware, requirePolicy } from '../middleware/auth';

const courses = new Hono<{ Bindings: Env }>();

// All course routes require auth
courses.use('*', authMiddleware);

// GET /api/courses/all — all courses (for student browsing)
courses.get('/all', async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM courses ORDER BY code').all();
  return c.json({ courses: rows.results });
});

// GET /api/courses — list courses
courses.get('/', async (c) => {
  const user = c.get('user')!;

  if (user.role === 'lecturer') {
    const rows = await c.env.DB.prepare(
      'SELECT * FROM courses WHERE lecturer_id = ? ORDER BY created_at DESC'
    ).bind(user.id).all();
    return c.json({ courses: rows.results });
  } else {
    // Students see their enrolled courses
    const rows = await c.env.DB.prepare(
      `SELECT c.* FROM courses c
       INNER JOIN course_enrollments ce ON c.id = ce.course_id
       WHERE ce.student_id = ?
       ORDER BY c.created_at DESC`
    ).bind(user.id).all();
    return c.json({ courses: rows.results });
  }
});

// GET /api/courses/:id
courses.get('/:id', async (c) => {
  const id = c.req.param('id');
  const course = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();
  if (!course) return c.json({ error: 'Course not found' }, 404);
  return c.json({ course });
});

// POST /api/courses — create course (lecturer only)
courses.post('/', requirePolicy('canCreateCourses'), async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json<{
    code: string; name: string; location?: string; classGroup?: string;
    latitude?: number; longitude?: number; radius?: number;
    startDate: string; totalContactHours: number; hoursPerWeek: number;
  }>();

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO courses (id, code, name, location, class_group, latitude, longitude, radius, start_date, total_contact_hours, hours_per_week, lecturer_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, body.code, body.name, body.location || '', body.classGroup || '', body.latitude || null, body.longitude || null,
    body.radius || 50, body.startDate, body.totalContactHours, body.hoursPerWeek, user.id).run();

  const course = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();
  return c.json({ course }, 201);
});

// PUT /api/courses/:id — update course
courses.put('/:id', requirePolicy('canCreateCourses'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    code?: string; name?: string; location?: string; classGroup?: string;
    latitude?: number; longitude?: number; radius?: number;
    startDate?: string; totalContactHours?: number; hoursPerWeek?: number;
  }>();

  const existing = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();
  if (!existing) return c.json({ error: 'Course not found' }, 404);

  await c.env.DB.prepare(
    `UPDATE courses SET code = COALESCE(?, code), name = COALESCE(?, name),
     location = COALESCE(?, location), class_group = COALESCE(?, class_group),
     latitude = COALESCE(?, latitude),
     longitude = COALESCE(?, longitude), radius = COALESCE(?, radius),
     start_date = COALESCE(?, start_date), total_contact_hours = COALESCE(?, total_contact_hours),
     hours_per_week = COALESCE(?, hours_per_week) WHERE id = ?`
  ).bind(body.code || null, body.name || null, body.location || null, body.classGroup || null,
    body.latitude ?? null, body.longitude ?? null, body.radius ?? null, body.startDate || null,
    body.totalContactHours ?? null, body.hoursPerWeek ?? null, id).run();

  const course = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();
  return c.json({ course });
});

// DELETE /api/courses/:id
courses.delete('/:id', requirePolicy('canCreateCourses'), async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// POST /api/courses/:id/enroll — student enrolls in a course
courses.post('/:id/enroll', requirePolicy('canCheckIn'), async (c) => {
  const user = c.get('user')!;
  const courseId = c.req.param('id');

  const course = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) return c.json({ error: 'Course not found' }, 404);

  const existing = await c.env.DB.prepare(
    'SELECT * FROM course_enrollments WHERE course_id = ? AND student_id = ?'
  ).bind(courseId, user.id).first();

  if (existing) {
    return c.json({ error: 'Already enrolled' }, 409);
  }

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO course_enrollments (id, course_id, student_id) VALUES (?, ?, ?)'
  ).bind(id, courseId, user.id).run();

  return c.json({ success: true, enrollment: { id, courseId, studentId: user.id } }, 201);
});

// POST /api/courses/scan-qr — enroll via QR code scan
courses.post('/scan-qr', requirePolicy('canCheckIn'), async (c) => {
  const user = c.get('user')!;
  const { code } = await c.req.json<{ code: string }>();

  // Look up course by code
  const course = await c.env.DB.prepare('SELECT * FROM courses WHERE code = ?').bind(code).first<{
    id: string; code: string; name: string;
  }>();

  if (!course) return c.json({ error: 'Course not found with that code' }, 404);

  const existing = await c.env.DB.prepare(
    'SELECT * FROM course_enrollments WHERE course_id = ? AND student_id = ?'
  ).bind(course.id, user.id).first();

  if (existing) {
    return c.json({ course, alreadyEnrolled: true });
  }

  const enrollmentId = crypto.randomUUID();
  await c.env.DB.prepare(
    'INSERT INTO course_enrollments (id, course_id, student_id) VALUES (?, ?, ?)'
  ).bind(enrollmentId, course.id, user.id).run();

  return c.json({ course, alreadyEnrolled: false });
});

export default courses;
