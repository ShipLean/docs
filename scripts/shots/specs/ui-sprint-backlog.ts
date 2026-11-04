import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'ui-sprint-backlog-overview',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/backlog`,
  },
  {
    name: 'ui-sprint-backlog-burndown',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/backlog`,
  },
  {
    name: 'ui-sprint-backlog-rollover',
    // The Close sprint button in the sprint header opens the dialog. Nothing opens by itself.
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/backlog`,
    steps: async (page) => {
      await page.getByTestId('sprints-close-sprint').click();
      await page.getByTestId('sprints-end-apply').waitFor({ state: 'visible' });
      await page.getByTestId('sprints-end-row').first().waitFor({ state: 'visible' });
    },
  },
];
