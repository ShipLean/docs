import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'agents-connect-address', route: '/profile',
    steps: async (page) => {
      await page.getByTestId('agent-connected-add-line').scrollIntoViewIfNeeded();
    },
  },
];
