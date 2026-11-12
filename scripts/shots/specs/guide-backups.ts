import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'guide-backups-settings',
    route: '/instance/backups',
    steps: async (page) => {
      const settings = page.getByTestId('backups-page');
      await settings.waitFor({ state: 'visible' });
      await page.getByTestId('backups-cron-description').waitFor({ state: 'visible' });
      await page.getByTestId('backups-save-button').waitFor({ state: 'visible' });
    },
  },
];
