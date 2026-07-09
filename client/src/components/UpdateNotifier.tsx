import { useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';

const POLL_MS = 30_000;
const KEY = 'e-attendance-deployment-id';

export default function UpdateNotifier() {
  const { logout } = useAppStore();
  const lastId = useRef<string | null>(localStorage.getItem(KEY));

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { deploymentId } = await res.json() as { deploymentId: string };
        if (!lastId.current) { lastId.current = deploymentId; localStorage.setItem(KEY, deploymentId); return; }
        if (deploymentId !== lastId.current) {
          localStorage.removeItem(KEY);
          logout();
          window.location.reload();
        }
      } catch {}
    };
    check();
    const i = setInterval(check, POLL_MS);
    return () => clearInterval(i);
  }, [logout]);

  return null;
}
