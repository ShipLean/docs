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
    name: 'ui-backlogs-new-story',
    route: stories,
    steps: async (page) => {
      await page.getByTestId('backlog-new-item').click();
      await page.getByTestId('backlog-add-row').waitFor({ state: 'visible' });
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
    name: 'ui-backlogs-new-epic',
    route: epics,
    steps: async (page) => {
      await page.getByTestId('backlog-new-item').click();
      await page.getByTestId('backlog-add-row').waitFor({ state: 'visible' });
    },
  },
];
