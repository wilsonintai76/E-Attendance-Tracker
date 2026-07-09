-- Normalized E-Attendance Schema (3NF)
-- All tables use TEXT UUIDs as primary keys

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT DEFAULT '',
  role TEXT NOT NULL CHECK(role IN ('lecturer', 'student')),
  matric_no TEXT DEFAULT '',
  class_group TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Courses table (lecturer-owned)
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  latitude REAL,
  longitude REAL,
  radius INTEGER DEFAULT 50,
  start_date TEXT NOT NULL,
  total_contact_hours INTEGER NOT NULL,
  hours_per_week INTEGER NOT NULL,
  lecturer_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Course enrollments (many-to-many: student ↔ course)
CREATE TABLE IF NOT EXISTS course_enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(course_id, student_id)
);

-- Attendance sessions (belongs to a course, created by lecturer)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  class_group TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  lecturer_id TEXT NOT NULL REFERENCES users(id),
  student_count INTEGER DEFAULT 0,
  latitude REAL,
  longitude REAL,
  radius INTEGER,
  week INTEGER,
  hours INTEGER DEFAULT 2,
  delivery_mode TEXT DEFAULT 'f2f' CHECK(delivery_mode IN ('f2f', 'online')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Attendance records (student check-in per session)
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id),
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'present' CHECK(status IN ('present', 'absent', 'late', 'bermasalah')),
  latitude REAL,
  longitude REAL,
  distance_to_center REAL,
  in_geofence INTEGER DEFAULT 0,
  evidence_type TEXT DEFAULT '',
  evidence_notes TEXT DEFAULT '',
  evidence_file_key TEXT DEFAULT '',
  evidence_file_name TEXT DEFAULT '',
  approval_status TEXT DEFAULT 'none' CHECK(approval_status IN ('pending', 'approved', 'rejected', 'none')),
  approval_notes TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Alerts (attendance warnings)
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES users(id),
  course_code TEXT NOT NULL,
  attendance_rate REAL NOT NULL,
  threshold REAL NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'both' CHECK(type IN ('email', 'in_app', 'both')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'read')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_courses_lecturer ON courses(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_lecturer ON attendance_sessions(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course ON attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_alerts_student ON alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_alerts_course ON alerts(course_code);
