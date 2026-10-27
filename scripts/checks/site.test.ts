import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { checkExternalLink, checkOverflow, checkoutExample, serveBuiltSite } from './site.js';

test('Checks_WhenAnExternalLinkIs404_ShouldFail', async () => {
  const server = await serveBuiltSite(resolve('dist'));
  try {
    await assert.rejects(checkExternalLink({ url: server.url + '/deterministic-missing-link/', pages: ['/acceptance-test/'] }, []), /HTTP 404/);
  } finally { await server.close(); }
});

test('Checks_WhenThePageOverflowsAt390px_ShouldFail', async () => {
  const server = await serveBuiltSite(resolve('dist'));
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(server.url, { waitUntil: 'networkidle' });
    await checkOverflow(page);
    await page.evaluate(() => {
      const element = document.createElement('div');
      element.id = 'overflow-acceptance';
      element.style.cssText = 'width:1000px;height:10px;position:absolute;left:0;top:0';
      document.body.append(element);
    });
    await assert.rejects(checkOverflow(page), /Horizontal overflow.*1000px/);
    await page.evaluate(() => document.querySelector('#overflow-acceptance')!.remove());
    await checkOverflow(page);
  } finally { await browser.close(); await server.close(); }
});

test('Premerge example validation rejects genuinely missing tracked files', () => {
  assert.equal(checkoutExample('https://raw.githubusercontent.com/ShipLean/docs/main/examples/quickstart/docker-compose.yml', process.cwd()), 'examples/quickstart/docker-compose.yml');
  assert.equal(checkoutExample('https://github.com/ShipLean/docs/tree/main/examples/proxy', process.cwd()), 'examples/proxy');
  assert.throws(() => checkoutExample('https://github.com/ShipLean/docs/tree/main/examples/not-present', process.cwd()), /Missing tracked example/);
  assert.throws(() => checkoutExample('https://github.com/ShipLean/docs/blob/main/examples/not-present.yml', process.cwd()), /Missing tracked example/);
  assert.equal(checkoutExample('https://github.com/another/repo/blob/main/examples/not-present.yml', process.cwd()), undefined);
});
