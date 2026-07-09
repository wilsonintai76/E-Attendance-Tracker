// Cloudflare Workers types for bindings
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  STORAGE: R2Bucket;
  JWT_SECRET?: string;
}
