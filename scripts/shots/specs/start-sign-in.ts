import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'start-sign-in-google-button',
    route: '/login',
    public: true,
    steps: async (page) => {
      await page.getByRole('link', { name: /google/i }).waitFor({ state: 'visible' });
    },
  },
];
