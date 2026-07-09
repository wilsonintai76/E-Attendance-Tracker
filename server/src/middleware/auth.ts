import { Context, Next } from 'hono';

// PBAC: Policy-Based Access Control
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'lecturer' | 'student';
  policies: AuthPolicies;
}

export interface AuthPolicies {
  canCreateCourses: boolean;
  canManageSessions: boolean;
  canCheckIn: boolean;
  canViewAllRecords: boolean;
  canApproveAppeals: boolean;
  canSendAlerts: boolean;
  canUploadEvidence: boolean;
}

function derivePolicies(role: 'lecturer' | 'student'): AuthPolicies {
  if (role === 'lecturer') {
    return {
      canCreateCourses: true, canManageSessions: true, canCheckIn: false,
      canViewAllRecords: true, canApproveAppeals: true, canSendAlerts: true,
      canUploadEvidence: false,
    };
  }
  return {
    canCreateCourses: false, canManageSessions: false, canCheckIn: true,
    canViewAllRecords: false, canApproveAppeals: false, canSendAlerts: false,
    canUploadEvidence: true,
  };
}

function getSecret(c: Context): string {
  return c.env.JWT_SECRET || 'e-attendance-dev-secret-change-in-production';
}

// Sign JWT with embedded PBAC policies
export async function signToken(c: Context, user: { id: string; name: string; email: string; role: 'lecturer' | 'student' }): Promise<string> {
  const { SignJWT } = await import('jose');
  const secret = new TextEncoder().encode(getSecret(c));
  return new SignJWT({ sub: user.id, name: user.name, email: user.email, role: user.role, policies: derivePolicies(user.role) })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('24h').sign(secret);
}

// Verify JWT and extract user with policies
export async function verifyToken(c: Context, token: string): Promise<AuthUser | null> {
  try {
    const { jwtVerify } = await import('jose');
    const secret = new TextEncoder().encode(getSecret(c));
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.sub as string, name: payload.name as string, email: payload.email as string,
      role: payload.role as 'lecturer' | 'student',
      policies: (payload.policies as AuthPolicies) || derivePolicies(payload.role as 'lecturer' | 'student'),
    };
  } catch { return null; }
}

// Auth middleware — verifies JWT, attaches user with policies
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  const user = await verifyToken(c, authHeader.slice(7));
  if (!user) return c.json({ error: 'Invalid or expired token' }, 401);
  c.set('user', user);
  await next();
}

// PBAC guard — checks a specific policy
export function requirePolicy(policy: keyof AuthPolicies) {
  return async (c: Context, next: Next) => {
    const user = c.get('user') as AuthUser | undefined;
    if (!user?.policies[policy]) return c.json({ error: 'Forbidden — insufficient permissions' }, 403);
    await next();
  };
}
