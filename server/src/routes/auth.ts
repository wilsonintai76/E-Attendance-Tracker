import { Hono } from 'hono';
import { signToken, authMiddleware } from '../middleware/auth';

const auth = new Hono<{ Bindings: Env }>();

// POST /api/auth/google — Google Sign-In bridge
auth.post('/google', async (c) => {
  const { credential } = await c.req.json<{ credential: string }>();

  if (!credential) {
    return c.json({ error: 'Missing Google credential' }, 400);
  }

  // Verify Google ID token
  let payload: { email?: string; name?: string; picture?: string };
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
    );
    if (!res.ok) return c.json({ error: 'Invalid Google token' }, 401);
    payload = await res.json<typeof payload>();
  } catch {
    return c.json({ error: 'Failed to verify Google token' }, 500);
  }

  const email = payload.email;
  const name = payload.name || email?.split('@')[0] || 'User';
  const avatar = payload.picture || '';

  if (!email) return c.json({ error: 'Google account has no email' }, 400);

  const role: 'lecturer' | 'student' =
    email.toLowerCase().endsWith('@poliku.edu.my') ? 'lecturer' : 'student';

  // Upsert user in D1
  const existing = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<{
    id: string; name: string; email: string; avatar: string; role: string;
    matric_no: string; class_group: string;
  }>();

  let user: { id: string; name: string; email: string; avatar: string; role: string; matric_no: string; class_group: string };

  if (existing) {
    await c.env.DB.prepare("UPDATE users SET name = ?, avatar = COALESCE(NULLIF(?, ''), avatar), role = ? WHERE email = ?")
      .bind(name, avatar, role, email).run();
    user = { ...existing, name, avatar: avatar || existing.avatar, role };
  } else {
    const id = crypto.randomUUID();
    await c.env.DB.prepare('INSERT INTO users (id, name, email, avatar, role, matric_no, class_group) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, name, email, avatar, role, '', '').run();
    user = { id, name, email, avatar, role, matric_no: '', class_group: '' };
  }

  const token = await signToken(c, { id: user.id, name: user.name, email: user.email, role: user.role as 'lecturer' | 'student' });

  return c.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role, matricNo: user.matric_no, classGroup: user.class_group },
  });
});

// GET /api/auth/me — get current user
auth.get('/me', authMiddleware, async (c) => {
  const authUser = c.get('user')!;
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(authUser.id).first<{
    id: string; name: string; email: string; avatar: string; role: string;
    matric_no: string; class_group: string; phone: string;
  }>();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // Get enrolled course IDs
  const enrollments = await c.env.DB.prepare(
    'SELECT course_id FROM course_enrollments WHERE student_id = ?'
  ).bind(user.id).all<{ course_id: string }>();

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      matricNo: user.matric_no,
      classGroup: user.class_group,
      phone: user.phone || '',
      enrolledCourses: enrollments.results?.map((e) => e.course_id) || [],
    },
  });
});

// PUT /api/auth/profile — update user profile
auth.put('/profile', authMiddleware, async (c) => {
  const authUser = c.get('user')!;
  const body = await c.req.json<{
    matricNo?: string;
    classGroup?: string;
    phone?: string;
  }>();

  await c.env.DB.prepare(
    `UPDATE users SET matric_no = COALESCE(NULLIF(?, ''), matric_no), class_group = COALESCE(NULLIF(?, ''), class_group), phone = COALESCE(NULLIF(?, ''), phone) WHERE id = ?`
  ).bind(body.matricNo || '', body.classGroup || '', body.phone || '', authUser.id).run();

  // Return updated user
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(authUser.id).first<{
    id: string; name: string; email: string; avatar: string; role: string;
    matric_no: string; class_group: string; phone: string;
  }>();

  if (!user) return c.json({ error: 'User not found' }, 404);

  const enrollments = await c.env.DB.prepare(
    'SELECT course_id FROM course_enrollments WHERE student_id = ?'
  ).bind(user.id).all<{ course_id: string }>();

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      matricNo: user.matric_no,
      classGroup: user.class_group,
      phone: user.phone || '',
      enrolledCourses: enrollments.results?.map((e) => e.course_id) || [],
    },
  });
});

export default auth;