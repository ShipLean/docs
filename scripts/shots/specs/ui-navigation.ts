import type { ShotSpec } from '../types';

const project = '/p/DEMO/backlogs/stories';

export const shots: ShotSpec[] = [
  {
    name: 'ui-navigation-quicksearch',
    route: project,
    steps: async (page, ctx) => {
      // Recent items are saved in this browser when an item opens, so open two before returning.
      for (const key of [ctx.stories[0], ctx.stories[1]]) {
        await page.goto(new URL(`/p/${ctx.projectKey}/items/${key}`, page.url()).href);
        await page.getByTestId('work-item-title').waitFor({ state: 'visible' });
      }
      await page.goto(new URL(`/p/${ctx.projectKey}/backlogs/stories`, page.url()).href);
      await page.getByTestId('shell-main').waitFor({ state: 'visible' });
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+P' : 'Control+P');
      await page.getByTestId('quick-search-dialog').waitFor({ state: 'visible' });
      await page.getByTestId('quick-search-input').waitFor({ state: 'visible' });
    },
  },
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
