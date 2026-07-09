import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import courses from './routes/courses';
import sessions from './routes/sessions';
import records from './routes/records';
import alerts from './routes/alerts';
import version from './routes/version';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'https://e-attendance.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Storage upload endpoint (R2) — auth required, students can only upload to evidence/ keys
app.put('/api/storage/upload/:key', async (c) => {
  // Verify JWT
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const { verifyToken } = await import('./middleware/auth');
  const user = await verifyToken(c, authHeader.slice(7));
  if (!user) return c.json({ error: 'Invalid or expired token' }, 401);

  const key = decodeURIComponent(c.req.param('key'));

  // Students may only write to evidence/ namespace; lecturers are unrestricted
  if (user.role === 'student' && !key.startsWith('evidence/')) {
    return c.json({ error: 'Forbidden — students may only upload evidence files' }, 403);
  }

  const body = await c.req.arrayBuffer();
  await c.env.STORAGE.put(key, body, {
    httpMetadata: { contentType: c.req.header('Content-Type') || 'application/octet-stream' },
  });

  return c.json({ success: true, key });
});

// Storage download endpoint (R2) — auth required
app.get('/api/storage/download/:key', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const { verifyToken } = await import('./middleware/auth');
  const user = await verifyToken(c, authHeader.slice(7));
  if (!user) return c.json({ error: 'Invalid or expired token' }, 401);

  const key = decodeURIComponent(c.req.param('key'));
  const object = await c.env.STORAGE.get(key);

  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  c.header('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream');
  c.header('Cache-Control', 'public, max-age=3600');
  return c.body(object.body);
});

// Mount routes
app.route('/api/auth', auth);
app.route('/api/courses', courses);
app.route('/api/sessions', sessions);
app.route('/api/records', records);
app.route('/api/alerts', alerts);
app.route('/api/version', version);

export default app;
