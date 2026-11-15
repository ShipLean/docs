// Fails when a page in src/content/docs/inspection/ is missing from the sidebar,
// or an agent page lacks a heading or frontmatter key from _agent-template.md.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sidebar } from '../src/sidebar.ts';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'src/content/docs/inspection');
const agentPages = ['claude-code', 'codex-cli', 'cursor'];

function links(items: readonly unknown[]): string[] {
  return items.flatMap((i) => {
    const e = i as { link?: string; items?: unknown[] };
    return [...(e.link ? [e.link] : []), ...(e.items ? links(e.items) : [])];
  });
}

const headings = (text: string) => [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
const frontmatterKeys = (text: string) => {
  const fm = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? '';
  return [...fm.matchAll(/^([A-Za-z]+):/gm)].map((m) => m[1]);
};

const errors: string[] = [];
const linked = new Set(links(sidebar));
const pages = readdirSync(root).filter((f) => /\.mdx?$/.test(f) && !f.startsWith('_'));
for (const f of pages) {
  const slug = f.replace(/\.mdx?$/, '');
  if (!linked.has(`/inspection/${slug}/`)) errors.push(`${f}: no sidebar entry for /inspection/${slug}/`);
}
for (const l of linked) {
  const slug = /^\/inspection\/([^/]+)\/$/.exec(l)?.[1];
  if (slug && !pages.some((f) => f.replace(/\.mdx?$/, '') === slug)) errors.push(`sidebar links to missing page ${l}`);
}

const template = readFileSync(join(root, '_agent-template.md'), 'utf8');
const required = headings(template);
const requiredKeys = frontmatterKeys(template).filter((k) => k.startsWith('checked'));
for (const slug of agentPages) {
  const file = pages.find((f) => f.replace(/\.mdx?$/, '') === slug);
  if (!file) { errors.push(`agent page ${slug} is missing`); continue; }
  const text = readFileSync(join(root, file), 'utf8');
  const have = headings(text);
  for (const h of required) if (!have.includes(h)) errors.push(`${file}: missing heading "${h}"`);
  const keys = frontmatterKeys(text);
  for (const k of requiredKeys) if (!keys.includes(k)) errors.push(`${file}: missing frontmatter "${k}"`);
}

if (errors.length) {
  console.error(`Inspection page check failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`Inspection page check passed: ${pages.length} pages, ${agentPages.length} agent pages.`);
