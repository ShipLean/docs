import type { SeedResult, ShotSpec } from '../types';

// The current sprint's Retro tab. Its stories finish inside its dates, so Coverage lists them. A sprint that has ended
// would show Coverage empty, because the seed finishes its stories today, after the sprint's end date.
const retro = (ctx: SeedResult) => `/p/DEMO/sprints/${ctx.sprint}/retro`;

export const shots: ShotSpec[] = [
  {
    name: 'ui-sprint-retro-by-category',
    route: retro,
    steps: async (page) => {
      await page.getByTestId('retro-board-column').first().waitFor({ state: 'visible' });
      await page.getByTestId('retro-note').first().waitFor({ state: 'visible' });
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
      // The open editor is taller than the room left under the notes, so bring its buttons into view.
      await column.getByTestId('retro-board-add-save').scrollIntoViewIfNeeded();
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
