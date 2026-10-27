import type { SeedResult, ShotSpec } from '../types';

const feature = (ctx: SeedResult) => `/p/${ctx.projectKey}/items/${ctx.features[0]}`;

export const shots: ShotSpec[] = [
  {
    name: 'work-validate-status',
    route: feature,
    steps: async (page) => {
      await page.getByTestId('feature-status-edit').click();
      await page.getByTestId('feature-status-editor').waitFor({ state: 'visible' });
    },
  },
];
