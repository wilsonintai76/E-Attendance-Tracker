import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

const POLL_INTERVAL_MS = 60_000; // Check every 60 seconds
const STORAGE_KEY = 'e-attendance-deployment-id';

/**
 * Periodically polls GET /api/version to detect when a new deployment
 * has been pushed. When the deploymentId changes, shows a persistent
 * toast prompting the user to reload.
 */
export default function UpdateNotifier() {
  const lastDeploymentId = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null,
  );

  useEffect(() => {
    let toastId: string | number | undefined;
    let intervalId: ReturnType<typeof setInterval>;

    const checkForUpdate = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;

        const data = await res.json() as { version: string; deploymentId: string };

        // First visit — store the current deployment id
        if (!lastDeploymentId.current) {
          lastDeploymentId.current = data.deploymentId;
          localStorage.setItem(STORAGE_KEY, data.deploymentId);
          return;
        }

        // Deployment changed — new version available
        if (data.deploymentId !== lastDeploymentId.current) {
          lastDeploymentId.current = data.deploymentId;
          localStorage.setItem(STORAGE_KEY, data.deploymentId);

          // Dismiss any existing update toast
          if (toastId !== undefined) toast.dismiss(toastId);

          toastId = toast('🔄 A new version is available!', {
            description: `Version ${data.version} has been deployed. Reload to get the latest features and fixes.`,
            duration: Infinity,
            action: {
              label: 'Reload Now',
              onClick: () => {
                window.location.reload();
              },
            },
            cancel: {
              label: 'Later',
              onClick: () => {
                // User dismissed — will prompt again on next poll if still changed
              },
            },
            icon: <RefreshCw className="h-4 w-4" />,
          });
        }
      } catch {
        // Silently ignore — server may be unreachable temporarily
      }
    };

    // Initial check
    checkForUpdate();

    // Poll periodically
    intervalId = setInterval(checkForUpdate, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Renders nothing — it's a side-effect-only component
  return null;
}
