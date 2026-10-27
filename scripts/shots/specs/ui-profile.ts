import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  { name: 'ui-profile-overview', route: '/profile' },
  { name: 'ui-profile-identity', route: '/profile' },
  {
    name: 'ui-profile-appearance', route: '/profile',
    steps: async (page) => {
      await page.getByTestId('settings-appearance-panel').evaluate(element => element.scrollIntoView({ block: 'start' }));
    },
  },
  {
    name: 'ui-profile-connected-agents', route: '/profile',
    steps: async (page) => {
      await page.getByTestId('agent-connected-add-line').scrollIntoViewIfNeeded();
    },
  },
];
