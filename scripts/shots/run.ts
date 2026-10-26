import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import type { SeedResult, ShotSpec } from './types';

const here = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(here, '../../src/assets/shots');
const viewport = { width: 1440, height: 900 };
const limit = 150_000;
type Admin = { email: string; password: string };
type SeedDemo = (baseUrl: string, admin: Admin) => Promise<SeedResult>;

class RunnerError extends Error {}

function options(args: string[]) {
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key === '--help') return { help: true, values };
    if (!['--page', '--no-stack', '--config', '--browser'].includes(key)) {
      throw new RunnerError('Unknown option. Use pnpm shots --help.');
    }
    if (values[key] !== undefined || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new RunnerError('Each option requires one value and may appear only once.');
    }
    values[key] = args[++i];
  }
  return { help: false, values };
}

function applicationUrl(baseUrl: string, route: string): string {
  if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\')) {
    throw new RunnerError('Shot routes must be application-relative paths starting with /.');
  }
  const url = new URL(route, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) throw new RunnerError('Shot route changed origin.');
  return url.href;
}

async function loadSeed(): Promise<SeedDemo> {
  const file = resolve(here, 'seed.ts');
  try {
    await access(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new RunnerError('Missing scripts/shots/seed.ts. Add the C5 seedDemo implementation, or use --page _sample for the public sign-in smoke capture.');
    }
    throw new RunnerError('Cannot read scripts/shots/seed.ts.');
  }
  const module = await import(pathToFileURL(file).href);
  if (typeof module.seedDemo !== 'function') {
    throw new RunnerError('scripts/shots/seed.ts must export seedDemo(baseUrl, admin).');
  }
  return module.seedDemo;
}

async function loadShots(page?: string): Promise<ShotSpec[]> {
  const files = (await readdir(resolve(here, 'specs'))).filter((f) => f.endsWith('.ts')).sort();
  if (page && (!/^[a-zA-Z0-9_-]+$/.test(page) || !files.includes(`${page}.ts`))) {
    throw new RunnerError('--page must match an existing spec basename exactly, without .ts.');
  }
  const names = new Set<string>();
  const selected: ShotSpec[] = [];
  for (const file of files) {
    if (file === '_sample.ts' && page !== '_sample') continue;
    const module = await import(pathToFileURL(resolve(here, 'specs', file)).href);
    if (!Array.isArray(module.shots)) throw new RunnerError(`Spec ${file} must export shots: ShotSpec[].`);
    for (const shot of module.shots as ShotSpec[]) {
      if (!shot || !/^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(shot.name) || names.has(shot.name)) {
        throw new RunnerError(`Spec ${file} contains an invalid or duplicate section-prefixed shot name.`);
      }
      names.add(shot.name);
      if (typeof shot.route !== 'string' && typeof shot.route !== 'function') {
        throw new RunnerError(`Spec ${file} contains an invalid route.`);
      }
      if (!page || file === `${page}.ts`) selected.push(shot);
    }
  }
  if (page === '_sample' && (selected.length !== 1 || selected[0].route !== '/login' || selected[0].steps)) {
    throw new RunnerError('_sample must contain exactly one public /login shot without steps.');
  }
  if (!selected.length) throw new RunnerError('No ordinary shot specs found. Add a page spec or select --page _sample.');
  return selected;
}

async function healthy(baseUrl: string, signal: AbortSignal) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (signal.aborted) throw new RunnerError('Screenshot capture interrupted.');
    try {
      const response = await fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(3000) });
      if (response.ok) return;
    } catch { /* The stack may still be starting. */ }
    await delay(500);
  }
  throw new RunnerError('ShipLean did not answer GET /health successfully within 120 seconds.');
}

async function compose(project: string, env: NodeJS.ProcessEnv, args: string[], signal?: AbortSignal) {
  await new Promise<void>((done, reject) => {
    const child = spawn('docker', ['compose', '-p', project, '-f', resolve(here, 'docker-compose.yml'), ...args], {
      env, signal,
      // Container/startup output can contain credentials. Never relay it.
      stdio: 'ignore',
    });
    child.on('error', () => reject(new RunnerError('Cannot run Docker Compose. Install Docker, or use --no-stack <baseUrl>.')));
    child.on('exit', (code) => code === 0 ? done() : reject(new RunnerError('Docker Compose failed. Inspect the isolated screenshot stack locally.')));
  });
}

async function stable(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  });
}

async function signIn(page: Page, baseUrl: string, admin: Admin) {
  await page.goto(applicationUrl(baseUrl, '/login?returnUrl=%2Fprofile'));
  await page.getByLabel('Email', { exact: true }).fill(admin.email);
  await page.getByLabel('Password', { exact: true }).fill(admin.password);
  const response = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/login' && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  if (!(await response).ok()) throw new RunnerError('Sign-in failed. Check the disposable instance admin credentials.');
  await page.waitForURL(applicationUrl(baseUrl, '/profile'));
}

async function themeControl(page: Page, theme: 'light' | 'dark') {
  const control = page.locator(`[data-testid="settings-theme-option"][data-value="${theme}"]`);
  await control.waitFor({ state: 'visible' });
  // A selected option makes no request; otherwise wait for persistence, not only the optimistic UI.
  if (await control.getAttribute('aria-pressed') !== 'true') {
    const saved = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/me/preferences/theme' && r.request().method() === 'PUT');
    await control.click();
    if (!(await saved).ok()) throw new RunnerError('The app could not save the screenshot theme.');
  }
  await page.waitForFunction((value) => document.documentElement.dataset.theme === value, theme);
}

/** Keep the actual file at 1440x900, including cropped specs. Never just rename oversized bytes. */
export async function encodeShot(png: Buffer, theme: 'light' | 'dark'): Promise<Buffer> {
  const canvas = await sharp(png).resize({ ...viewport, fit: 'contain', background: theme === 'dark' ? '#20252e' : '#ffffff' }).png().toBuffer();
  for (const scale of [1, 0.8, 0.6, 0.4]) {
    const reduced = scale === 1 ? canvas : await sharp(canvas)
      .resize(Math.round(viewport.width * scale), Math.round(viewport.height * scale)).png().toBuffer();
    const source = scale === 1 ? reduced : await sharp(reduced).resize(viewport.width, viewport.height).png().toBuffer();
    for (const quality of [82, 72, 62, 52, 42, 32, 22, 12, 1]) {
      const webp = await sharp(source).webp({ quality, effort: 6 }).toBuffer();
      if (webp.byteLength <= limit) return webp;
    }
  }
  throw new RunnerError('Unable to encode this shot under 150,000 bytes.');
}

export async function main(args = process.argv.slice(2)) {
  const { help, values } = options(args);
  if (help) {
    console.log('pnpm shots [--page <exact-basename>] [--no-stack <baseUrl>] [--config <private-json>] [--browser <executable>]\nAdmin: SHIPLEAN_ADMIN_EMAIL / SHIPLEAN_ADMIN_PASSWORD or config {admin:{email,password}}. Use only a disposable instance: ordinary captures restore demo fixtures.');
    return;
  }
  let config: { baseUrl?: string; admin?: Partial<Admin> } = {};
  if (values['--config']) {
    try { config = JSON.parse(await readFile(values['--config'], 'utf8')); }
    catch { throw new RunnerError('Cannot read the JSON configuration file.'); }
    if (!config || typeof config !== 'object') throw new RunnerError('Configuration must be a JSON object.');
  }
  const sample = values['--page'] === '_sample';
  // Check this before requiring credentials, starting a stack, or attempting a browser launch.
  const seedDemo = sample ? undefined : await loadSeed();
  const shots = await loadShots(values['--page']);
  const admin = {
    email: process.env.SHIPLEAN_ADMIN_EMAIL ?? config.admin?.email,
    password: process.env.SHIPLEAN_ADMIN_PASSWORD ?? config.admin?.password,
  };
  const noStack = values['--no-stack'] !== undefined;
  if ((!sample || !noStack) && (typeof admin.email !== 'string' || !admin.email || typeof admin.password !== 'string' || !admin.password)) {
    throw new RunnerError('Set SHIPLEAN_ADMIN_EMAIL and SHIPLEAN_ADMIN_PASSWORD, or provide a private --config file with admin.email and admin.password.');
  }
  const port = process.env.SHIPLEAN_SHOTS_PORT ?? '18080';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new RunnerError('SHIPLEAN_SHOTS_PORT must be a valid TCP port.');
  let baseUrl: string;
  try {
    const url = new URL(values['--no-stack'] ?? `http://127.0.0.1:${port}`);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    baseUrl = url.origin;
  } catch { throw new RunnerError('The base URL must be an http(s) origin without credentials, a path, query, or fragment.'); }
  const project = `shiplean-shots-${randomBytes(6).toString('hex')}`;
  const env = { ...process.env, SHIPLEAN_SHOTS_PORT: port, SHIPLEAN_ADMIN_EMAIL: admin.email, SHIPLEAN_ADMIN_PASSWORD: admin.password, POSTGRES_PASSWORD: randomBytes(24).toString('hex') };
  let started = false;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const captureTime = new Date();
  const abort = new AbortController();
  // SIGINT/SIGTERM close the browser, causing pending work to unwind through finally.
  const stop = () => { abort.abort(); void browser?.close(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  try {
    if (!noStack) {
      started = true;
      console.log(`Starting isolated screenshot stack ${project}.`);
      await compose(project, env, ['up', '-d', '--wait', '--wait-timeout', '120'], abort.signal);
    }
    await healthy(baseUrl, abort.signal);
    browser = await chromium.launch({ executablePath: values['--browser'] ?? process.env.PLAYWRIGHT_EXECUTABLE_PATH });
    await mkdir(output, { recursive: true });
    for (const shot of shots) {
      for (const theme of ['light', 'dark'] as const) {
        console.log(`Capturing ${shot.name} (${theme}).`);
        if (abort.signal.aborted) throw new RunnerError('Screenshot capture interrupted.');
        const ctx = seedDemo ? await seedDemo(baseUrl, admin as Admin) : undefined;
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: theme, timezoneId: 'UTC', locale: 'en-US', reducedMotion: 'reduce' });
        try {
          const page = await context.newPage();
          page.setDefaultTimeout(30_000);
          await page.clock.setFixedTime(captureTime);
          if (!sample) {
            await signIn(page, baseUrl, admin as Admin);
            await themeControl(page, theme);
          }
          // Public login has no theme control; it follows the emulated OS preference.
          const route = typeof shot.route === 'function' ? shot.route(ctx!) : shot.route;
          await page.goto(applicationUrl(baseUrl, route));
          if (sample) await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor({ state: 'visible' });
          else {
            await page.getByTestId('shell-main').waitFor({ state: 'visible' });
            await page.waitForFunction((value) => document.documentElement.dataset.theme === value, theme);
          }
          if (shot.steps) await shot.steps(page, ctx!);
          await stable(page);
          const png = await page.screenshot({ type: 'png', clip: shot.clip, animations: 'disabled', caret: 'hide' });
          const webp = await encodeShot(png, theme);
          await writeFile(resolve(output, `${shot.name}-${theme}.webp`), webp);
          console.log(`${shot.name}-${theme}.webp: ${webp.byteLength} bytes, 1440x900`);
        } finally { await context.close(); }
      }
    }
  } finally {
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
    try { await browser?.close(); }
    finally { if (started) await compose(project, env, ['down', '--volumes', '--remove-orphans']); }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    // Third-party errors (Playwright, spec code, REST) can embed request data or filled values.
    console.error(error instanceof RunnerError ? error.message : 'Screenshot capture failed. Check the browser installation, app UI and spec steps. External error details are suppressed to protect credentials.');
    process.exitCode = 1;
  });
}
