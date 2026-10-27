import { createServer } from 'node:http';
import { statSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Page } from 'playwright';

export type Exclusion = { url: string; statuses: number[]; reason: string };
export type Link = { url: string; pages: string[] };

export async function builtPages(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await builtPages(path));
    else if (entry.name.endsWith('.html')) result.push(path);
  }
  return result;
}

export async function externalLinks(directory: string): Promise<Link[]> {
  const links = new Map<string, Set<string>>();
  for (const path of await builtPages(directory)) {
    const html = await readFile(path, 'utf8');
    for (const match of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gi)) {
      const href = match[1].replaceAll('&amp;', '&');
      if (!/^https?:\/\//.test(href)) continue;
      const url = new URL(href);
      url.hash = '';
      const key = url.href;
      if (!links.has(key)) links.set(key, new Set());
      links.get(key)!.add(path.slice(directory.length));
    }
  }
  return [...links].map(([url, pages]) => ({ url, pages: [...pages] }));
}

// C8 examples are linked to main before this PR merges. Validate the exact
// repository/ref/path against Git's tracked files, never exempt an entire host.
export function checkoutExample(url: string, root: string): string | undefined {
  const parsed = new URL(url);
  let path: string | undefined;
  if (parsed.origin === 'https://raw.githubusercontent.com') {
    path = parsed.pathname.match(/^\/ShipLean\/docs\/(?:main|feat\/docs-site)\/(examples\/.+)$/)?.[1];
  } else if (parsed.origin === 'https://github.com') {
    path = parsed.pathname.match(/^\/ShipLean\/docs\/(?:blob|tree)\/(?:main|feat\/docs-site)\/(examples\/.+)$/)?.[1];
  }
  if (!path) return;
  path = decodeURIComponent(path);
  const tracked = execFileSync('git', ['ls-files', '-z', '--', path], { cwd: root, encoding: 'utf8' }).split('\0');
  const isTree = parsed.origin === 'https://github.com' && parsed.pathname.startsWith('/ShipLean/docs/tree/');
  if (!(isTree ? tracked.some(file => file.startsWith(path + '/')) : tracked.includes(path))) {
    throw new Error(`Missing tracked example for ${url}: ${path}`);
  }
  const info = statSync(resolve(root, path));
  if (isTree ? !info.isDirectory() : !info.isFile()) throw new Error(`Invalid checkout example kind: ${url}`);
  return path;
}

export async function checkExternalLink(link: Link, exclusions: Exclusion[]): Promise<string> {
  const exclusion = exclusions.find(entry => entry.url === link.url);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(link.url, {
        method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20_000),
        headers: { 'User-Agent': 'ShipLean-docs-link-check/1.0 (+https://github.com/ShipLean/docs)' },
      });
      await response.body?.cancel();
      if (response.ok) return `OK ${response.status} ${link.url}`;
      const retryable = [403, 408, 429, 500, 502, 503, 504].includes(response.status);
      if (retryable && attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      if (exclusion?.statuses.includes(response.status)) {
        return `EXCLUDED ${response.status} ${link.url}: ${exclusion.reason}`;
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt < 2 && !(error instanceof Error && error.message.startsWith('HTTP '))) continue;
      throw new Error(`Broken external link ${link.url} on ${link.pages.join(', ')}: ${String(error)}`);
    }
  }
  throw new Error(`External link check exhausted: ${link.url}`);
}

export async function checkOverflow(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return {
      width,
      scroll: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      elements: [...document.querySelectorAll('body *')].filter(element => {
        const box = element.getBoundingClientRect();
        // A wide code block within a scroll container does not overflow the page.
        return box.width > 0 && box.right > width + 1 && !element.closest('pre, [hidden]');
      }).slice(0, 8).map(element => `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}.${element.className}`),
    };
  });
  if (overflow.scroll > overflow.width + 1) {
    throw new Error(`Horizontal overflow at ${page.url()}: viewport ${overflow.width}px, document ${overflow.scroll}px; candidates: ${overflow.elements.join(', ')}`);
  }
}

export async function serveBuiltSite(directory: string) {
  const root = resolve(directory);
  const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url!, 'http://localhost').pathname);
      let path = resolve(root, '.' + pathname);
      if (path !== root && !path.startsWith(root + sep)) throw new Error('Outside site');
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      const body = await readFile(path);
      response.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No local server port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())),
  };
}
