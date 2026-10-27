import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

// Use the reader's files in a clean deployment directory, without a source build.
const root = resolve('.');
const directory = mkdtempSync(join(tmpdir(), 'shiplean-quickstart-'));
const project = `docs-check-${randomBytes(8).toString('hex')}`;
const email = `docs-${randomBytes(8).toString('hex')}@example.com`;
const password = randomBytes(32).toString('hex');
const databasePassword = randomBytes(32).toString('hex');
const environment: NodeJS.ProcessEnv = { ...process.env, COMPOSE_PROJECT_NAME: project };
// These are substituted only by the copied .env file, as in the published steps.
for (const key of ['SHIPLEAN_IMAGE', 'SHIPLEAN_ADMIN_EMAIL', 'SHIPLEAN_ADMIN_PASSWORD', 'POSTGRES_PASSWORD', 'COMPOSE_FILE', 'COMPOSE_PROFILES', 'COMPOSE_ENV_FILES']) delete environment[key];

function docker(args: string[], allowFailure = false): void {
  const result = spawnSync('docker', args, { cwd: directory, env: environment, encoding: 'utf8', timeout: 360_000 });
  // Do not dump container configuration, logs or authentication responses: they can contain credentials.
  if (!allowFailure && (result.error || result.status !== 0)) throw new Error(`Docker ${args[0]} ${args[1] ?? ''} failed (exit ${result.status ?? 'unknown'}); output withheld to protect ephemeral credentials`);
}

try {
  copyFileSync(join(root, 'examples/quickstart/docker-compose.yml'), join(directory, 'docker-compose.yml'));
  const template = readFileSync(join(root, 'examples/quickstart/.env'), 'utf8');
  const substitutions = { POSTGRES_PASSWORD: databasePassword, SHIPLEAN_ADMIN_EMAIL: email, SHIPLEAN_ADMIN_PASSWORD: password };
  let dotenv = template;
  for (const [key, value] of Object.entries(substitutions)) {
    if (!new RegExp(`^${key}=.+$`, 'm').test(dotenv)) throw new Error(`Missing example setting: ${key}`);
    dotenv = dotenv.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${value}`);
  }
  writeFileSync(join(directory, '.env'), dotenv, { mode: 0o600 });
  // The page embeds these exact files; prevent verification of a different example.
  const page = readFileSync(join(root, 'src/content/docs/start/quickstart.mdx'), 'utf8');
  for (const [language, content] of [['yaml', readFileSync(join(directory, 'docker-compose.yml'), 'utf8')], ['dotenv', template]]) {
    if (!page.includes('```' + language + '\n' + content.trimEnd() + '\n```')) throw new Error(`Quickstart inline ${language} differs from the downloadable file`);
  }
  docker(['compose', 'up', '-d']);
  const base = 'http://127.0.0.1:8080';
  const deadline = Date.now() + 180_000;
  let healthy = false;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(5000) });
      if (response.ok && (await response.json()).status === 'ok') { healthy = true; break; }
    } catch { /* Startup can take time while PostgreSQL becomes ready. */ }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  if (!healthy) throw new Error('Published Compose service did not become healthy within 180 seconds');
  const spa = await fetch(base);
  if (!spa.ok || !(await spa.text()).includes('<html')) throw new Error('App page did not serve HTML');
  const anonymous = await fetch(`${base}/api/me`);
  if (anonymous.status !== 401) throw new Error('Anonymous identity request should be rejected');
  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`Sign-in failed (HTTP ${login.status})`);
  const cookie = login.headers.getSetCookie().find((value) => value.startsWith('shiplean.auth='))?.split(';')[0];
  if (!cookie) throw new Error('Sign-in did not set the application session cookie');
  const me = await fetch(`${base}/api/me`, { headers: { Cookie: cookie } });
  if (!me.ok || (await me.json()).email !== email) throw new Error('Authenticated identity request did not return the signed-in user');
  console.log('PASS: fresh published-image Compose startup, /health, app HTML, anonymous rejection, cookie sign-in and authenticated /api/me');

  copyFileSync(join(root, 'examples/caddy/Caddyfile'), join(directory, 'Caddyfile'));
  docker(['run', '--rm', '--network', 'none', '-e', 'SHIPLEAN_DOMAIN=docs-check.example.com', '-v', `${directory}/Caddyfile:/etc/caddy/Caddyfile:ro`, 'caddy:2', 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile']);
  console.log('PASS: exact committed Caddyfile validates in the published Caddy container');
} finally {
  docker(['compose', 'down', '--volumes', '--remove-orphans'], true);
  rmSync(directory, { recursive: true, force: true });
}
