import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// 1. Read current version from server version route
const versionPath = resolve(root, 'server', 'src', 'routes', 'version.ts');
let versionContent = readFileSync(versionPath, 'utf-8');
const match = versionContent.match(/version:\s*'(\d+)\.(\d+)\.(\d+)'/);
if (!match) { console.error('Could not find version in version.ts'); process.exit(1); }

const [, major, minor, patch] = match;
const newVersion = `${major}.${minor}.${parseInt(patch) + 1}`;
const oldVersion = `${major}.${minor}.${patch}`;
console.log(`🚀 Bumping version: ${oldVersion} → ${newVersion}`);

// 2. Update server/src/routes/version.ts
versionContent = versionContent.replace(`'${oldVersion}'`, `'${newVersion}'`);
writeFileSync(versionPath, versionContent, 'utf-8');

// 3. Update both package.json files
for (const pkg of ['server/package.json', 'client/package.json']) {
  const pkgPath = resolve(root, pkg);
  let content = readFileSync(pkgPath, 'utf-8');
  content = content.replace(`"${oldVersion}"`, `"${newVersion}"`);
  writeFileSync(pkgPath, content, 'utf-8');
}

// 4. Deploy API (server)
console.log('📦 Deploying API...');
execSync('npx wrangler deploy', { cwd: resolve(root, 'server'), stdio: 'inherit' });

// 5. Build frontend
console.log('🔨 Building frontend...');
execSync('npx vite build', { cwd: resolve(root, 'client'), stdio: 'inherit' });

// 6. Deploy frontend
console.log('🌎 Deploying frontend...');
execSync(
  'npx wrangler pages deploy dist --project-name e-attendance --branch main --commit-dirty=true',
  { cwd: resolve(root, 'client'), stdio: 'inherit' }
);

// 7. Commit version bump
console.log('📝 Committing version bump...');
execSync('git add -A', { cwd: root, stdio: 'inherit' });
execSync(`git commit -m "chore: bump to v${newVersion}"`, { cwd: root, stdio: 'inherit' });
execSync('git push', { cwd: root, stdio: 'inherit' });

console.log(`✅ Deployed v${newVersion} successfully!`);
