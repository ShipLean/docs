import type { ShotSpec } from '../types';

const draft: NonNullable<ShotSpec['steps']> = async (page) => {
  await page.getByTestId('settings-newproject-name').fill('Acme workspace');
  await page.getByTestId('settings-newproject-key').fill('ACME');
};

export const shots: ShotSpec[] = [
  { name: 'ui-new-project-overview', route: '/projects/new' },
  { name: 'ui-new-project-key', route: '/projects/new', steps: draft },
  {
    name: 'ui-new-project-options', route: '/projects/new',
    steps: async (page, ctx) => {
      await draft(page, ctx);
      await page.getByTestId('settings-newproject-sprint-end').scrollIntoViewIfNeeded();
    },
  },
];
