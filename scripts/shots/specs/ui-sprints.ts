import type { ShotSpec } from '../types';

const sprints = '/p/DEMO/sprints';

export const shots: ShotSpec[] = [
  { name: 'ui-sprints-overview', route: sprints },
  {
    name: 'ui-sprints-create', route: sprints,
    steps: async (page) => {
      await page.getByTestId('sprints-new-sprint-name').fill('Sprint 2');
      await page.getByTestId('sprints-new-sprint-goal').fill('Try the first-project guide with a new teammate');
      await page.getByTestId('sprints-new-sprint').scrollIntoViewIfNeeded();
    },
  },
  {
    name: 'ui-sprints-velocity',
    route: sprints,
    steps: async (page, ctx) => {
      await page.route(`**/api/projects/${ctx.projectId}/velocity`, (route) =>
        route.fulfill({
          json: {
            window: 3,
            average: 24,
            override: null,
            sprints: [
              { sprintId: '00000000-0000-4000-8000-000000000004', sprintName: 'Sprint 17', committed: 27, completed: 21 },
              { sprintId: '00000000-0000-4000-8000-000000000005', sprintName: 'Sprint 18', committed: 25, completed: 24 },
              { sprintId: '00000000-0000-4000-8000-000000000006', sprintName: 'Sprint 19', committed: 26, completed: 27 },
            ],
          },
        }),
      );
      await page.reload();
      await page.getByTestId('sprints-velocity-chart').waitFor({ state: 'visible' });
    },
  },
];
