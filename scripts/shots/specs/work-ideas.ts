import type { SeedResult, ShotSpec } from '../types';

const features = (ctx: SeedResult) => `/p/${ctx.projectKey}/backlogs/features`;

export const shots: ShotSpec[] = [
  {
    name: 'work-ideas-new-feature',
    route: features,
    steps: async (page) => {
      await page.getByTestId('backlog-new-item').click();
      await page.getByTestId('backlog-new-feature-title').waitFor({ state: 'visible' });
    },
  },
];
