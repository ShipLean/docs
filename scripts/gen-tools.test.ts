import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, copyFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

test('generator includes payload tools and escapes MDX in their descriptions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'shiplean-tool-reference-'));
  try {
    const scripts = join(root, 'scripts');
    const pages = join(root, 'src/content/docs/agents');
    const product = join(root, 'product');
    const tools = join(product, 'src/ShipLean.WebApi/Features/Mcp/Tools/Capture');
    await Promise.all([mkdir(scripts, { recursive: true }), mkdir(pages, { recursive: true }),
      mkdir(tools, { recursive: true }), mkdir(join(product, 'docs'), { recursive: true })]);
    await copyFile(resolve(import.meta.dirname, 'gen-tools.ts'), join(scripts, 'gen-tools.ts'));
    await writeFile(join(pages, 'tools.mdx'), '{/* GENERATED TOOL REFERENCE START */}\n{/* GENERATED TOOL REFERENCE END */}\n');
    await writeFile(join(product, 'docs/mcp.md'), '`capture_work`');
    await writeFile(join(tools, 'CaptureTools.cs'), `
      [McpServerTool(Name = "capture_work"), McpScope(McpScopes.Write, PreviewScope = McpScopes.Read), McpPayload]
      [Description("Upload {items: []} with <file>.")]
      public async Task<CallToolResult> Capture() { }
    `);
    execFileSync(process.execPath, [join(scripts, 'gen-tools.ts'), `--product-dir=${product}`]);
    const page = await readFile(join(pages, 'tools.mdx'), 'utf8');
    assert.match(page, /#### `capture_work`/);
    assert.match(page, /&#123;items: \[\]&#125; with &lt;file&gt;/);
    assert.match(page, /A preview call uses read scope/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
