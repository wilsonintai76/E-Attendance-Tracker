const API_BASE = import.meta.env.PROD
  ? 'https://e-attendance-api.wilson-b6f.workers.dev/api'
  : '/api';

// Types — camelCase for frontend use (normalized from snake_case API)
export type Role = 'lecturer' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  matricNo?: string;
  classGroup?: string;
  phone?: string;
  enrolledCourses?: string[];
}

export interface AttendanceSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  classGroup: string;
  date: string;
  startTime: string;
  code: string;
  status: 'active' | 'inactive';
  lecturerId: string;
  studentCount: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  week?: number;
  hours?: number;
  deliveryMode?: 'f2f' | 'online';
}

export interface Course {
  id: string;
  code: string;
  name: string;
  location: string;
  classGroup?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  startDate: string;
  totalContactHours: number;
  hoursPerWeek: number;
  lecturerId?: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  matricNo: string;
  classGroup: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late' | 'bermasalah';
  latitude?: number;
  longitude?: number;
  distanceToCenter?: number;
  inGeofence?: number;
  evidenceType?: string;
  evidenceNotes?: string;
  evidenceFileKey?: string;
  evidenceFileName?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'none';
  approvalNotes?: string;
}

export interface AttendanceAlert {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseCode: string;
  courseName: string;
  attendanceRate: number;
  threshold: number;
  timestamp: string;
  type: 'email' | 'in_app' | 'both';
  message: string;
  status: 'sent' | 'read';
  spmpLetterUrl?: string;
  spmpLetterName?: string;
}

// Snake→camelCase conversion
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function normalizeObject<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = obj[key];
  }
  return result as T;
}

function normalizeArray<T>(arr: unknown[]): T[] {
  return arr.map((item) => normalizeObject<T>(item as Record<string, unknown>));
}

// Token management
let authToken: string | null = localStorage.getItem('e_attendance_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('e_attendance_token', token);
  } else {
    localStorage.removeItem('e_attendance_token');
  }
}

export function getToken(): string | null {
  return authToken;
}

// Generic fetch wrapper with auto-normalization
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return normalizeObject(data) as T;
}

// ========== Auth API ==========
export async function googleLogin(credential: string) {
  const data = await apiFetch<{ token: string; user: Record<string, unknown> }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
  setToken(data.token);
  return normalizeObject<User>(data.user);
}

// NOTE: /auth/login endpoint does not exist. Google Sign-In (googleLogin) is the only login path.

export async function getMe() {
  const data = await apiFetch<{ user: Record<string, unknown> }>('/auth/me');
  return normalizeObject<User>(data.user);
}

export async function updateProfile(profile: { matricNo?: string; classGroup?: string; phone?: string }) {
  const data = await apiFetch<{ user: Record<string, unknown> }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return normalizeObject<User>(data.user);
}

// ========== Courses API ==========
export async function fetchAllCourses() {
  const data = await apiFetch<{ courses: unknown[] }>('/courses/all');
  return normalizeArray<Course>(data.courses);
}

export async function fetchCourses() {
  const data = await apiFetch<{ courses: unknown[] }>('/courses');
  return normalizeArray<Course>(data.courses);
}

export async function createCourse(course: Omit<Course, 'id' | 'lecturerId'>) {
  const data = await apiFetch<{ course: Record<string, unknown> }>('/courses', {
    method: 'POST', body: JSON.stringify(course),
  });
  return normalizeObject<Course>(data.course);
}

export async function updateCourse(id: string, updates: Partial<Course>) {
  const data = await apiFetch<{ course: Record<string, unknown> }>(`/courses/${id}`, {
    method: 'PUT', body: JSON.stringify(updates),
  });
  return normalizeObject<Course>(data.course);
}

export async function deleteCourse(id: string) {
  await apiFetch(`/courses/${id}`, { method: 'DELETE' });
}

export async function enrollInCourse(courseId: string) {
  return apiFetch<{ success: boolean }>(`/courses/${courseId}/enroll`, { method: 'POST' });
}

export async function unenrollFromCourse(courseId: string) {
  return apiFetch<{ success: boolean }>(`/courses/${courseId}/unenroll`, { method: 'DELETE' });
}

export async function fetchCourseStudents(courseId: string) {
  const data = await apiFetch<{ students: unknown[] }>(`/courses/${courseId}/students`);
  return normalizeArray<{
    id: string; name: string; email: string;
    matricNo: string; classGroup: string; avatar: string;
  }>(data.students);
}

export async function removeStudentFromCourse(courseId: string, studentId: string) {
  return apiFetch<{ success: boolean }>(`/courses/${courseId}/students/${studentId}`, { method: 'DELETE' });
}

export async function scanQRCode(code: string) {
  const data = await apiFetch<{ course: Record<string, unknown>; alreadyEnrolled: boolean }>('/courses/scan-qr', {
    method: 'POST', body: JSON.stringify({ code }),
  });
  return { ...data, course: normalizeObject<Course>(data.course) };
}

// ========== Sessions API ==========
export async function fetchSessions() {
  const data = await apiFetch<{ sessions: unknown[] }>('/sessions');
  return normalizeArray<AttendanceSession>(data.sessions);
}

export async function fetchActiveSessions(classGroup: string) {
  const data = await apiFetch<{ sessions: unknown[] }>(`/sessions/active?classGroup=${encodeURIComponent(classGroup)}`);
  return normalizeArray<AttendanceSession>(data.sessions);
}

export async function createSession(session: {
  courseId: string; courseCode: string; courseName: string;
  classGroup: string; date: string; startTime: string; code: string;
  latitude?: number; longitude?: number; radius?: number;
  week?: number; hours?: number; deliveryMode?: 'f2f' | 'online';
}) {
  const data = await apiFetch<{ session: Record<string, unknown> }>('/sessions', {
    method: 'POST', body: JSON.stringify(session),
  });
  return normalizeObject<AttendanceSession>(data.session);
}

export async function checkInSession(sessionId: string, checkIn: {
  latitude?: number; longitude?: number; distanceToCenter?: number;
  inGeofence?: boolean; evidenceType?: string; evidenceNotes?: string;
}) {
  const data = await apiFetch<{ record: Record<string, unknown> }>(`/sessions/${sessionId}/checkin`, {
    method: 'POST', body: JSON.stringify(checkIn),
  });
  return normalizeObject<AttendanceRecord>(data.record);
}

export async function updateSession(sessionId: string, updates: { date?: string; week?: number; status?: 'active' | 'inactive' }) {
  const data = await apiFetch<{ session: Record<string, unknown> }>(`/sessions/${sessionId}`, {
    method: 'PUT', body: JSON.stringify(updates),
  });
  return normalizeObject<AttendanceSession>(data.session);
}

export async function fetchSessionStudents(sessionId: string) {
  const data = await apiFetch<{ students: unknown[] }>(`/sessions/${sessionId}/students`);
  return normalizeArray<{ id: string; name: string; email: string; matric_no: string; class_group: string; record_status: string; record_id: string | null }>(data.students);
}

export async function bulkMarkAttendance(sessionId: string, absentIds: string[]) {
  return apiFetch<{ created: number; present: number; absent: number }>(`/sessions/${sessionId}/bulk-attendance`, {
    method: 'POST', body: JSON.stringify({ absentIds }),
  });
}

// ========== Records API ==========
export async function fetchRecords(sessionId?: string) {
  const path = sessionId ? `/records?sessionId=${encodeURIComponent(sessionId)}` : '/records';
  const data = await apiFetch<{ records: unknown[] }>(path);
  return normalizeArray<AttendanceRecord>(data.records);
}

export async function updateRecord(id: string, updates: {
  approvalStatus?: 'approved' | 'rejected'; approvalNotes?: string;
  status?: 'present' | 'absent' | 'late' | 'bermasalah';
}) {
  const data = await apiFetch<{ record: Record<string, unknown> }>(`/records/${id}`, {
    method: 'PUT', body: JSON.stringify(updates),
  });
  return normalizeObject<AttendanceRecord>(data.record);
}

// ========== Alerts API ==========
export async function fetchAlerts() {
  const data = await apiFetch<{ alerts: unknown[] }>('/alerts');
  return normalizeArray<AttendanceAlert>(data.alerts);
}

export async function createAlert(alert: {
  studentId: string; studentName: string; studentEmail: string;
  courseCode: string; courseName: string; attendanceRate: number;
  threshold: number; type?: 'email' | 'in_app' | 'both'; message: string;
}) {
  const data = await apiFetch<{ alert: Record<string, unknown> }>('/alerts', {
    method: 'POST', body: JSON.stringify(alert),
  });
  return normalizeObject<AttendanceAlert>(data.alert);
}

export async function sendBulkAlerts(params: {
  courseCode: string; courseName: string; threshold: number;
  messageTemplate: string; type?: 'email' | 'in_app' | 'both';
}) {
  const data = await apiFetch<{ sent: number; alerts: unknown[] }>('/alerts/send-bulk', {
    method: 'POST', body: JSON.stringify(params),
  });
  return { ...data, alerts: normalizeArray<AttendanceAlert>(data.alerts) };
}

export async function markAlertRead(id: string) {
  await apiFetch(`/alerts/${id}`, { method: 'PUT' });
}

// ========== Storage API ==========
export async function uploadEvidence(recordId: string, file: File) {
  const data = await apiFetch<{ uploadUrl: string; fileKey: string; fileName: string }>(
    `/records/${recordId}/evidence`,
    { method: 'POST', body: JSON.stringify({ fileName: file.name, fileType: file.type }) },
  );
  // uploadUrl is a relative path (/api/storage/upload/...). In production the API lives
  // on a different origin, so we must resolve it against API_BASE for a correct absolute URL.
  const absoluteUploadUrl = data.uploadUrl.startsWith('http')
    ? data.uploadUrl
    : `${API_BASE}${data.uploadUrl.replace(/^\/api/, '')}`;
  await fetch(absoluteUploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: file,
  });
  return data;
}

export async function uploadStorageFile(key: string, file: File) {
  const url = `${API_BASE}/storage/upload/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }
  return await res.json() as { success: boolean; key: string };
}

export async function downloadStorageFile(key: string, fileName: string) {
  const url = `${API_BASE}/storage/download/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }
  });
  
  if (!res.ok) {
    throw new Error(`Download failed: ${res.statusText}`);
  }
  
  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(objectUrl);
}
