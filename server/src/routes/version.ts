import { Hono } from 'hono';

const version = new Hono<{ Bindings: Env }>();

// Lazy-init — Workers forbid crypto at global scope.
// Generated once per isolate (i.e. once per deployment) on first request.
let DEPLOYMENT_ID = '';

version.get('/', (c) => {
  if (!DEPLOYMENT_ID) {
    DEPLOYMENT_ID = crypto.randomUUID();
  }
  return c.json({
    version: '0.3.9',
    deploymentId: DEPLOYMENT_ID,
  });
});

export default version;
