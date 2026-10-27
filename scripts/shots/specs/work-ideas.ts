import type { SeedResult, ShotSpec } from '../types';

const features = (ctx: SeedResult) => `/p/${ctx.projectKey}/backlogs/features`;
const feature = (ctx: SeedResult) => `/p/${ctx.projectKey}/items/${ctx.features[0]}`;

export const shots: ShotSpec[] = [
  {
    name: 'work-ideas-example-feature',
    route: feature,
  },
  {
    name: 'work-ideas-new-feature',
    route: features,
    steps: async (page) => {
      await page.getByTestId('backlog-new-item').click();
      await page.getByTestId('backlog-new-feature-title').waitFor({ state: 'visible' });
    },
  },
];
