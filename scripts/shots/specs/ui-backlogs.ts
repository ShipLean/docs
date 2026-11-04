import type { ShotSpec } from '../types';

const stories = (ctx: { projectKey: string }) => `/p/${ctx.projectKey}/backlogs/stories`;
const features = (ctx: { projectKey: string }) => `/p/${ctx.projectKey}/backlogs/features`;
const epics = (ctx: { projectKey: string }) => `/p/${ctx.projectKey}/backlogs/epics`;

export const shots: ShotSpec[] = [
  {
    name: 'ui-backlogs-overview',
    route: stories,
  },
  {
    name: 'ui-backlogs-tree',
    route: (ctx) => `${stories(ctx)}?mode=tree`,
  },
  {
    name: 'ui-backlogs-planning',
    route: (ctx) => `${stories(ctx)}?mode=planning`,
  },
  {
    name: 'ui-backlogs-features',
    route: features,
  },
  {
    name: 'ui-backlogs-epics',
    route: epics,
  },
  {
    name: 'ui-backlogs-filter',
    route: stories,
    steps: async (page) => {
      await page.getByTestId('backlog-filter-button').click();
      await page.getByTestId('backlog-filter-panel').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-backlogs-columns',
    route: stories,
    steps: async (page) => {
      await page.getByTestId('backlog-columns-button').click();
      await page.getByTestId('backlog-columns-menu').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-backlogs-new-feature',
    route: features,
    steps: async (page) => {
      await page.getByTestId('backlog-new-item').click();
      await page.getByTestId('backlog-new-feature-title').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-backlogs-add-many',
    route: stories,
    steps: async (page) => {
      await page.getByTestId('backlog-add-many').click();
      const source = page.getByTestId('backlog-paste-source');
      await source.waitFor({ state: 'visible' });
      // The last line repeats the title of an existing story, so one row shows the duplicate warning.
      await source.fill(
        [
          'Show a progress bar on the sign-up form\t3',
          'Add a welcome email',
          '  Write the email copy',
          'bug: Invite link opens the wrong project\t2',
          'Remember the last project opened\t2',
        ].join('\n'),
      );
      await source.blur();
      await page.getByTestId('backlog-paste-row-duplicate').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-backlogs-select-many',
    route: stories,
    steps: async (page) => {
      const boxes = page.getByTestId('backlog-row-select').locator('input[type="checkbox"]');
      for (let i = 0; i < 3; i++) await boxes.nth(i).check();
      await page.getByTestId('backlog-bulk-bar').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-backlogs-keys',
    route: stories,
    steps: async (page) => {
      await page.getByTestId('backlog-keys-button').click();
      await page.getByTestId('backlog-keys-dialog').waitFor({ state: 'visible' });
    },
  },
];
