import type { SeedResult, ShotSpec } from '../types';

const feature = (ctx: SeedResult) => `/p/${ctx.projectKey}/items/${ctx.features[0]}`;

export const shots: ShotSpec[] = [
  {
    name: 'ui-features-overview',
    route: feature,
  },
  {
    name: 'ui-features-goal-edit',
    route: feature,
    steps: async (page) => {
      await page.getByTestId('feature-goal-edit').click();
      await page.getByTestId('feature-goal-input').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-features-status-editor',
    route: feature,
    steps: async (page) => {
      await page.getByTestId('feature-status-edit').click();
      await page.getByTestId('feature-status-editor').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-features-attachment-page',
    route: feature,
    steps: async (page) => {
      const research = page
        .getByTestId('feature-rail-item')
        .filter({ hasText: 'first-project-research.md' });
      await research.getByRole('link').click();
      await page.getByTestId('attachment-body').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-features-add-link',
    route: feature,
    steps: async (page) => {
      await page.getByTestId('feature-add-link-open').click();
      await page.getByTestId('feature-add-link-form').waitFor({ state: 'visible' });
    },
  },
];
