// Fails when a page in src/content/docs/inspection/ is missing from the sidebar,
// or an agent page lacks a heading or frontmatter key from _agent-template.md.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sidebar } from '../src/sidebar.ts';

const root = join(fileURLToPath(new URL('..', import.meta.url)), 'src/content/docs/inspection');
const agentPages = ['claude-code', 'codex-cli', 'cursor'];
// The agent page headings, in order. The template must match this list, so deleting a heading
// from the template cannot weaken the check.
const fixedHeadings = ['What it emits', 'Set up', 'Tag the item', 'Content and privacy', 'Check it works', 'Known gaps'];
const fixedKeys = ['checkedWith', 'checkedOn'];

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
if (required.join('|') !== fixedHeadings.join('|')) {
  errors.push(`_agent-template.md: headings are [${required.join(', ')}], expected [${fixedHeadings.join(', ')}]`);
}
for (const k of fixedKeys) if (!requiredKeys.includes(k)) errors.push(`_agent-template.md: missing frontmatter "${k}"`);
for (const slug of agentPages) {
  const file = pages.find((f) => f.replace(/\.mdx?$/, '') === slug);
  if (!file) { errors.push(`agent page ${slug} is missing`); continue; }
  const text = readFileSync(join(root, file), 'utf8');
  const have = headings(text);
  for (const h of fixedHeadings) if (!have.includes(h)) errors.push(`${file}: missing heading "${h}"`);
  for (const h of have) if (!fixedHeadings.includes(h)) errors.push(`${file}: "${h}" must be a ### subsection of one of the standard headings, not an H2`);
  const positions = fixedHeadings.map((h) => have.indexOf(h)).filter((i) => i >= 0);
  if (positions.some((p, i) => i > 0 && p < positions[i - 1])) {
    errors.push(`${file}: headings are out of order, expected ${fixedHeadings.join(' > ')}`);
  }
  if (!text.includes('<CheckedWith ')) errors.push(`${file}: missing the <CheckedWith> line`);
  const keys = frontmatterKeys(text);
  for (const k of fixedKeys) if (!keys.includes(k)) errors.push(`${file}: missing frontmatter "${k}"`);
}

if (errors.length) {
  console.error(`Inspection page check failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`Inspection page check passed: ${pages.length} pages, ${agentPages.length} agent pages.`);
