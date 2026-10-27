import type { Page } from 'playwright';
import type { SeedResult, ShotSpec } from '../types';
import { shots as authorizeShots } from './ui-authorize';
import { shots as connectShots } from './agents-connect';

const feature = (ctx: SeedResult) => `/p/${ctx.projectKey}/items/${ctx.features[0]}`;

async function showResearchAttachment(page: Page) {
  const row = page.getByTestId('feature-rail-item').filter({ hasText: 'first-project-research.md' });
  await row.getByRole('link').click();
  await page.getByTestId('attachment-body').waitFor({ state: 'visible' });
}

export const shots: ShotSpec[] = [
  { ...connectShots[0], name: 'guide-first-agent-address' },
  { ...authorizeShots[0], name: 'guide-first-agent-consent' },
  { name: 'guide-first-agent-feature', route: feature, steps: showResearchAttachment },
];
