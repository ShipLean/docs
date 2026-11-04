import type { SeedResult, ShotSpec } from '../types';

// The Foundations sprint holds the retro points; its Retro tab is the one the docs describe.
const retro = (ctx: SeedResult) => `/p/DEMO/sprints/${ctx.recentSprint}/retro`;

export const shots: ShotSpec[] = [
  {
    name: 'ui-sprint-retro-by-category',
    route: retro,
    steps: async (page) => {
      await page.getByTestId('retro-column').first().waitFor({ state: 'visible' });
      await page.getByTestId('retro-point').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-sprint-retro-by-work-item',
    route: (ctx) => `${retro(ctx)}?view=item`,
    steps: async (page) => {
      await page.getByTestId('retro-card-list').waitFor({ state: 'visible' });
      await page.getByTestId('retro-card-header').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-sprint-retro-add-point',
    route: retro,
    steps: async (page) => {
      const column = page.locator('[data-testid="retro-board-column"][data-category="wentBadly"]');
      await column.getByTestId('retro-board-add').click();
      await column.getByTestId('retro-board-add-text').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-sprint-retro-action-item-dialog',
    route: retro,
    steps: async (page) => {
      const column = page.locator('[data-testid="retro-board-column"][data-category="improve"]');
      await column.getByTestId('retro-note-add-action').first().click();
      const dialog = page.getByTestId('retro-action-dialog');
      await dialog.waitFor({ state: 'visible' });
      await dialog.getByTestId('retro-action-title').fill('Write acceptance criteria before refinement ends');
      await dialog.getByTestId('retro-action-fix-option').filter({ hasText: 'Guide' }).click();
    },
  },
];
