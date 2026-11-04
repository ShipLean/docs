import type { ShotSpec } from '../types';
import { showTeamCapacity } from '../capacity-demo';

const planning = '/p/DEMO/backlogs/stories?mode=planning';

export const shots: ShotSpec[] = [
  { name: 'ui-planning-overview', route: planning },
  { name: 'ui-planning-forecast', route: planning },
  {
    name: 'ui-planning-capacity',
    steps: showTeamCapacity,
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/capacity`,
  },
  { name: 'ui-planning-velocity-window', route: '/p/DEMO/settings/sprints' },
  {
    name: 'ui-planning-before-you-plan',
    route: planning,
    steps: async (page) => {
      await page.getByTestId('backlog-plan-strip').waitFor({ state: 'visible' });
      await page.getByTestId('backlog-plan-check').first().waitFor({ state: 'visible' });
    },
  },
  {
    // The seed makes the next sprint hold 13 of 22 points and the first five backlog rows total 8, so the line reads 13 + 8 = 21 / 22.
    name: 'ui-planning-pull-line',
    route: planning,
    steps: async (page) => {
      await page.getByTestId('backlog-planning-forecast-toggle').check();
      const line = page.getByTestId('backlog-pull-line');
      await line.waitFor({ state: 'visible' });
      await line.scrollIntoViewIfNeeded();
    },
  },
];
