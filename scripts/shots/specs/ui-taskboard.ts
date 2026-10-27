import type { ShotSpec } from '../types';

const route = (ctx: { sprint: string }) => `/p/DEMO/sprints/${ctx.sprint}/taskboard`;

export const showStories: NonNullable<ShotSpec['steps']> = async (page) => {
  await page.locator('[data-testid="taskboard-group-option"][data-option="stories"]').click();
};

export const shots: ShotSpec[] = [
  { name: 'ui-taskboard-overview', route, steps: showStories },
  {
    name: 'ui-taskboard-people',
    route,
    steps: async (page) => {
      await page.locator('[data-testid="taskboard-group-option"][data-option="people"]').click();
      await page.locator('[data-testid="taskboard-row"][data-row="unassigned"]').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-taskboard-move',
    route,
    steps: async (page, ctx) => {
      await showStories(page, ctx);
      const card = page.getByTestId('taskboard-card').first();
      await card.focus();
      await page.keyboard.press('Alt+ArrowRight');
    },
  },
  {
    name: 'ui-taskboard-settings-fields',
    route: (ctx) => `${route(ctx)}?settings=fields`,
    steps: async (page) => {
      await page.getByTestId('taskboard-pane-fields').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-taskboard-settings-styles',
    route: (ctx) => `${route(ctx)}?settings=styles`,
    steps: async (page) => {
      await page.getByTestId('taskboard-pane-styles').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-taskboard-settings-tags',
    route: (ctx) => `${route(ctx)}?settings=tags`,
    steps: async (page) => {
      await page.getByTestId('taskboard-pane-tags').waitFor({ state: 'visible' });
    },
  },
];
