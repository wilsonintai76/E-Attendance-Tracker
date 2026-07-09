import { Hono } from 'hono';
import { authMiddleware, requirePolicy } from '../middleware/auth';

const records = new Hono<{ Bindings: Env }>();

records.use('*', authMiddleware);

// GET /api/records — list attendance records (JOIN users for student info)
records.get('/', async (c) => {
  const user = c.get('user')!;
  const sessionId = c.req.query('sessionId');

  const selectFields = `ar.*, u.name AS student_name, u.matric_no, u.class_group`;

  if (sessionId) {
    const rows = await c.env.DB.prepare(
      `SELECT ${selectFields} FROM attendance_records ar
       JOIN users u ON ar.student_id = u.id
       WHERE ar.session_id = ? ORDER BY ar.created_at DESC`
    ).bind(sessionId).all();
    return c.json({ records: rows.results });
  }

  if (user.role === 'student') {
    const rows = await c.env.DB.prepare(
      `SELECT ${selectFields} FROM attendance_records ar
       JOIN users u ON ar.student_id = u.id
       WHERE ar.student_id = ? ORDER BY ar.created_at DESC`
    ).bind(user.id).all();
    return c.json({ records: rows.results });
  }

  // Lecturer: only records for their courses' sessions
  const rows = await c.env.DB.prepare(
    `SELECT ${selectFields} FROM attendance_records ar
     JOIN users u ON ar.student_id = u.id
     INNER JOIN attendance_sessions s ON ar.session_id = s.id
     WHERE s.lecturer_id = ?
     ORDER BY ar.created_at DESC`
  ).bind(user.id).all();
  return c.json({ records: rows.results });
  return c.json({ records: rows.results });
});

// GET /api/records/:id
records.get('/:id', async (c) => {
  const id = c.req.param('id');
  const record = await c.env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Record not found' }, 404);
  return c.json({ record });
});

// PUT /api/records/:id — update record (approve/reject appeal)
records.put('/:id', requirePolicy('canApproveAppeals'), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    approvalStatus?: 'approved' | 'rejected';
    approvalNotes?: string;
    status?: 'present' | 'absent' | 'late' | 'bermasalah';
  }>();

  const record = await c.env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?').bind(id).first();
  if (!record) return c.json({ error: 'Record not found' }, 404);

  if (body.approvalStatus) {
    await c.env.DB.prepare(
      'UPDATE attendance_records SET approval_status = ?, approval_notes = ?, status = ? WHERE id = ?'
    ).bind(body.approvalStatus, body.approvalNotes || '',
      body.approvalStatus === 'approved' ? 'present' : 'bermasalah', id).run();
  } else if (body.status) {
    await c.env.DB.prepare('UPDATE attendance_records SET status = ? WHERE id = ?')
      .bind(body.status, id).run();
  }

  const updated = await c.env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?').bind(id).first();
  return c.json({ record: updated });
});

// POST /api/records/:id/evidence — upload evidence (R2 presigned URL)
records.post('/:id/evidence', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user')!;

  const record = await c.env.DB.prepare('SELECT * FROM attendance_records WHERE id = ?').bind(id).first<{
    student_id: string;
  }>();
  if (!record) return c.json({ error: 'Record not found' }, 404);
  if (record.student_id !== user.id) return c.json({ error: 'Forbidden' }, 403);

  const body = await c.req.json<{ fileName: string; fileType: string }>();
  const fileKey = `evidence/${id}/${Date.now()}-${body.fileName}`;

  // Generate R2 presigned upload URL using S3-compatible API
  // In production, use R2's S3 API or worker-to-worker presigned URLs
  // For now, return the key for direct upload via the Workers runtime
  const uploadUrl = `/api/storage/upload/${encodeURIComponent(fileKey)}`;

  await c.env.DB.prepare(
    'UPDATE attendance_records SET evidence_file_key = ?, evidence_file_name = ? WHERE id = ?'
  ).bind(fileKey, body.fileName, id).run();

  return c.json({ uploadUrl, fileKey, fileName: body.fileName });
});

export default records;
