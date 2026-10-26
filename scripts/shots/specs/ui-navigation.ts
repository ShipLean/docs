import type { ShotSpec } from '../types';

const project = '/p/DEMO/backlogs/stories';

export const shots: ShotSpec[] = [
  { name: 'ui-navigation-overview', route: project },
  {
    name: 'ui-navigation-project-picker',
    route: project,
    steps: async (page) => {
      await page.getByTestId('shell-project-button').click();
      await page.getByTestId('shell-picker').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-navigation-account-menu',
    route: project,
    steps: async (page) => {
      await page.getByTestId('shell-user-button').click();
      await page.getByTestId('shell-user-menu').waitFor({ state: 'visible' });
    },
  },
];
