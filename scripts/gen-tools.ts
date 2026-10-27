import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, basename } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const page = resolve(root, 'src/content/docs/agents/tools.mdx');
const start = '{/* GENERATED TOOL REFERENCE START */}';
const end = '{/* GENERATED TOOL REFERENCE END */}';
const args = process.argv.slice(2);
const check = args.includes('--check');
const productArg = args.find((arg) => arg.startsWith('--product-dir='))?.slice('--product-dir='.length);
const product = resolve(productArg ?? process.env.PRODUCT_DIR ?? '/home/joeld/shiplean-docs-product');
const toolsDir = resolve(product, 'src/ShipLean.WebApi/Features/Mcp/Tools');
const mcpDoc = resolve(product, 'docs/mcp.md');

type Tool = { name: string; scope: string; preview: boolean; area: string; description: string; parameters: string[] };
const groups: Record<string, string> = {
  Orient: 'Finding work', Capture: 'Capturing and editing', Attach: 'Capturing and editing', Links: 'Capturing and editing',
  Feature: 'Features and research', Planning: 'Planning', Sprint: 'Sprints', Backlog: 'Sprints', Status: 'Status and reporting', Work: 'Status and reporting',
};
const files = (await (await import('node:fs/promises')).readdir(toolsDir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.cs'))
  .map((entry) => resolve(entry.parentPath, entry.name)).sort();
const tools: Tool[] = [];
const prompts: string[] = [];

function unescapeCSharp(value: string): string {
  return value.replaceAll('\\"', '"').replaceAll('\\n', ' ').replaceAll('\\r', '').replaceAll('\\\\', '\\');
}
function description(text: string, from: number): { value: string; next: number } | null {
  const literal = '"(?:\\\\.|[^"\\\\])*"';
  const match = new RegExp(`\\[Description\\(((${literal})(?:\\s*\\+\\s*${literal})*)\\)\\]`, 'g');
  match.lastIndex = from;
  const found = match.exec(text);
  if (!found) return null;
  const value = [...found[1].matchAll(/"((?:\\.|[^"\\])*)"/g)].map((part) => unescapeCSharp(part[1])).join(' ');
  return { value, next: match.lastIndex };
}
function paramList(text: string): string[] {
  const found: string[] = [];
  const re = /\[Description\("((?:\\.|[^"\\])*)"\)\]\s*(?:IReadOnlyList<[^>]+>\??|[\w.]+\??)\s+(\w+)(?:\s*=\s*([^,\n]+))?/g;
  for (const match of text.matchAll(re)) {
    const name = match[2];
    const optional = match[3] !== undefined || text.slice(Math.max(0, (match.index ?? 0) - 80), match.index).includes('?');
    found.push(`\`${name}\`${optional ? ' (optional)' : ''} — ${unescapeCSharp(match[1]).replace(/[.;]$/, '')}`);
  }
  return found;
}

for (const file of files) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/\[McpServerTool\(Name\s*=\s*"([^"]+)"\)\s*,\s*McpScope\(McpScopes\.(Read|Write|Plan)([^)]*)\)\]/g)) {
    const name = match[1];
    const scope = match[2].toLowerCase();
    const after = match.index! + match[0].length;
    const desc = description(text, after);
    const methodAt = text.indexOf('public async Task<CallToolResult>', after);
    if (!desc?.value || methodAt < 0) throw new Error(`Missing public description or method for ${name} in ${file}`);
    const open = text.indexOf('{', methodAt);
    const sig = text.slice(methodAt, open);
    tools.push({ name, scope, preview: /PreviewScope\s*=\s*McpScopes\.Read/.test(match[3]), area: groups[basename(resolve(file, '..'))] ?? 'Other', description: desc.value, parameters: paramList(sig) });
  }
  for (const match of text.matchAll(/\[McpServerPrompt\(Name\s*=\s*"([^"]+)"\)\]/g)) {
    const after = match.index! + match[0].length;
    const desc = description(text, after);
    const methodAt = text.indexOf('public async Task<PromptMessage>', after);
    const open = text.indexOf('{', methodAt);
    const parameters = paramList(text.slice(methodAt, open));
    prompts.push(`- **\`${match[1]}\`** — ${desc?.value ?? 'Prompt.'}${parameters.length ? ` Arguments: ${parameters.join('; ')}.` : ''}`);
  }
}
if (tools.length === 0) throw new Error(`No [McpServerTool] registrations found under ${toolsDir}`);
const names = tools.map((tool) => tool.name);
if (new Set(names).size !== names.length) throw new Error('Duplicate server tool registration: ' + names.filter((name, i) => names.indexOf(name) !== i).join(', '));

const doc = await readFile(mcpDoc, 'utf8');
const docNames = new Set([...doc.matchAll(/`([a-z][a-z0-9_]+)`/g)].map((match) => match[1]));
const docsMissing = names.filter((name) => !docNames.has(name));
const docsListed = names.filter((name) => docNames.has(name));
const groupsInOrder = ['Finding work', 'Capturing and editing', 'Features and research', 'Planning', 'Sprints', 'Status and reporting', 'Other'];
let generated = `## Tools\n\nThe server currently registers **${tools.length} tools**. Each tool lists its required scope; preview calls use read scope until you apply them.\n`;
for (const group of groupsInOrder) {
  const inGroup = tools.filter((tool) => tool.area === group);
  if (!inGroup.length) continue;
  generated += `\n### ${group}\n`;
  for (const tool of inGroup) {
    generated += `\n#### \`${tool.name}\` — ${tool.scope}${tool.preview ? ` (preview: read; apply: ${tool.scope})` : ''}\n\n${tool.description.replaceAll('<', '&lt;').replaceAll('>', '&gt;')}\n`;
    if (tool.parameters.length) generated += `\nArguments: ${tool.parameters.join('; ')}.\n`;
  }
}
generated += `\n## Prompts\n\nPrompts give the agent a task-oriented starting message; they are separate from tools and do not have a tool scope.\n\n${prompts.join('\n')}\n`;
const block = `${start}\n${generated}\n${end}`;
const current = await readFile(page, 'utf8');
if (!current.includes(start) || !current.includes(end)) throw new Error('The tool page must contain the generated reference boundary markers.');
const updated = current.slice(0, current.indexOf(start)) + block + current.slice(current.indexOf(end) + end.length);
if (check) {
  if (updated !== current) {
    process.stderr.write('Tool reference is stale. Run pnpm tsx scripts/gen-tools.ts --product-dir=<product-source>.\n');
    process.exitCode = 1;
  } else {
    console.log(`Checked ${tools.length} registered tools and ${prompts.length} prompts.`);
  }
} else {
  await writeFile(page, updated);
  console.log(`Generated reference for ${tools.length} tools and ${prompts.length} prompts in ${relative(root, page)}.`);
}
console.log(`docs/mcp.md cross-check: ${docsListed.length}/${names.length} registered tools named; absent names: ${docsMissing.length ? docsMissing.join(', ') : 'none'}.`);
