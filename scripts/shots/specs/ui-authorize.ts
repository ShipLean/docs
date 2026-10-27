import { createHash, randomBytes } from 'node:crypto';
import type { Page } from 'playwright';
import type { ShotSpec } from '../types';

const clientName = 'ShipLean demo agent';
const redirectUri = 'http://127.0.0.1:18992/oauth/callback';
// One real, pending request per origin/scope set and runner process, shared by both themes.
// DCR has no deletion endpoint. This public demo client remains in the disposable runtime;
// no consent is submitted, no tokens are issued, and the DEMO seed registry is untouched.
const requests = new Map<string, Promise<string>>();

async function prepareRequest(page: Page, origin: string, plan: boolean): Promise<string> {
  const registration = await page.request.post(`${origin}/oauth/register`, {
    data: { client_name: clientName, redirect_uris: [redirectUri], token_endpoint_auth_method: 'none' },
  });
  if (registration.status() !== 201) throw new Error('Local demo OAuth registration failed.');
  const client = await registration.json();
  if (typeof client.client_id !== 'string' || !client.client_id) throw new Error('Missing demo OAuth client ID.');

  const address = await page.request.get(`${origin}/api/agents/mcp-url`);
  if (!address.ok()) throw new Error('Cannot read the local MCP resource address.');
  const { mcpUrl } = await address.json();
  if (typeof mcpUrl !== 'string' || new URL(mcpUrl).origin !== origin) {
    throw new Error('The demo OAuth resource must belong to the local runtime.');
  }
  const verifier = randomBytes(32).toString('base64url');
  const query = new URLSearchParams({
    response_type: 'code', client_id: client.client_id, redirect_uri: redirectUri,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256', resource: mcpUrl,
    scope: `shiplean:read shiplean:write${plan ? ' shiplean:plan' : ''}`, state: randomBytes(24).toString('base64url'),
  });
  const authorization = await page.request.get(`${origin}/oauth/authorize?${query}`, { maxRedirects: 0 });
  const location = authorization.headers().location;
  if (authorization.status() !== 302 || !location) throw new Error('Local OAuth authorization did not open consent.');
  const consent = new URL(location, origin);
  if (consent.origin !== origin || consent.pathname !== '/authorize' || !consent.searchParams.get('request')) {
    throw new Error('Local OAuth authorization returned an unexpected destination.');
  }
  return consent.href;
}

async function consent(page: Page, plan: boolean) {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname)) {
    throw new Error('Consent captures require a disposable loopback runtime.');
  }
  const cacheKey = `${origin}:${plan ? 'plan' : 'write'}`;
  let request = requests.get(cacheKey);
  if (!request) {
    request = prepareRequest(page, origin, plan);
    requests.set(cacheKey, request);
  }
  await page.goto(await request);
  const client = page.getByTestId('agent-consent-client');
  await client.waitFor({ state: 'visible' });
  if (await client.textContent() !== clientName
    || await page.getByTestId('agent-consent-host').getAttribute('data-verified') !== 'false'
    || await page.getByTestId('agent-consent-redirect-host').textContent() !== '127.0.0.1'
    || !await page.getByTestId('agent-consent-scope-read').isChecked()
    || !await page.getByTestId('agent-consent-scope-read').isDisabled()
    || !await page.getByTestId('agent-consent-scope-write').isChecked()
    || await page.getByTestId('agent-consent-scope-write').isDisabled()
    || await page.getByTestId('agent-consent-scope-plan').isChecked() !== plan
    || await page.getByTestId('agent-consent-scope-plan').isDisabled() !== !plan
    || !await page.getByTestId('agent-consent-allow').isEnabled()
    || !await page.getByTestId('agent-consent-deny').isEnabled()) {
    throw new Error('The live consent identity or requested scopes do not match the demo.');
  }
  await page.getByTestId('agent-consent-localhost-warning').waitFor({ state: 'visible' });
}

async function showConsent(page: Page) { await consent(page, false); }

// Show a real pending request for the extra scope without granting it.
export async function showPlanConsent(page: Page) { await consent(page, true); }

export const shots: ShotSpec[] = [
  { name: 'ui-authorize-overview', route: '/profile', steps: showConsent },
  { name: 'ui-authorize-review', route: '/profile', steps: showConsent },
];
