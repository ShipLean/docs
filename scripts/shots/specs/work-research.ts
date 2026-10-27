import type { SeedResult, ShotSpec } from '../types';

const feature = (ctx: SeedResult) => `/p/${ctx.projectKey}/items/${ctx.features[0]}`;

export const shots: ShotSpec[] = [
  {
    name: 'work-research-attachment',
    route: feature,
    steps: async (page) => {
      const research = page
        .getByTestId('feature-rail-item')
        .filter({ hasText: 'first-project-research.md' });
      await research.getByRole('link').click();
      await page.getByTestId('attachment-body').waitFor({ state: 'visible' });
    },
  },
];
