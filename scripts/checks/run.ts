import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { checkExternalLink, checkOverflow, checkoutExample, externalLinks, serveBuiltSite, type Exclusion } from './site.js';

const root = process.cwd();
const directory = resolve(root, 'dist');
const exclusions: Exclusion[] = JSON.parse(await readFile(new URL('./allowlist.json', import.meta.url), 'utf8'));
for (const entry of exclusions) {
  if (new URL(entry.url).href !== entry.url || !entry.reason.trim() || entry.statuses.length === 0 || entry.statuses.some(status => ![403, 429].includes(status))) {
    throw new Error(`Invalid exact URL/status exclusion: ${JSON.stringify(entry)}`);
  }
}
const links = await externalLinks(directory);
if (!links.length) throw new Error('Built site has no external links; run pnpm build first');
const failures: string[] = [];
const queue = [...links];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const link = queue.shift()!;
    try {
      const path = checkoutExample(link.url, root);
      console.log(path ? `CHECKOUT ${link.url} -> tracked ${path} (available when this PR merges)` : await checkExternalLink(link, exclusions));
    } catch (error) { failures.push(String(error)); }
  }
}));
console.log(`Checked ${links.length} distinct external links`);
const server = await serveBuiltSite(directory);
try {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    for (const path of ['/', '/start/quickstart/', '/start/configuration/', '/agents/tools/']) {
      const response = await page.goto(server.url + path, { waitUntil: 'networkidle' });
      if (!response?.ok()) throw new Error(`Mobile page ${path} returned ${response?.status()}`);
      await checkOverflow(page);
      console.log(`MOBILE 390px OK ${path}`);
    }
    // Exercise the generated Pagefind index in a real browser, including result URLs.
    for (const [term, expected] of [['OAuth', '/agents/auth/'], ['capacity', '/ui/planning/'], ['sprint', '/ui/sprints/']]) {
      const paths = await page.evaluate(async term => {
        const modulePath = '/pagefind/pagefind.js';
        const pagefind = await import(/* @vite-ignore */ modulePath);
        const result = await pagefind.search(term);
        return Promise.all(result.results.map(async (hit: { data(): Promise<{ url: string }> }) => (await hit.data()).url));
      }, term);
      if (!paths.some((path: string) => new URL(path, server.url).pathname === expected)) throw new Error(`Pagefind query "${term}" did not find ${expected}; found ${paths.join(', ')}`);
      console.log(`SEARCH OK "${term}" -> ${expected} (${paths.length} results)`);
    }
  } finally { await browser.close(); }
} catch (error) { failures.push(String(error)); }
finally { await server.close(); }
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log('All built-site checks passed');
