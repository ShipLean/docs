import type { ShotSpec } from '../types';

const project = '/p/DEMO';
const featureCard = (page: Parameters<NonNullable<ShotSpec['steps']>>[0], key: string) =>
  page.getByTestId('board-card').filter({
    has: page.getByTestId('board-card-key').filter({ hasText: key }),
  });

export const shots: ShotSpec[] = [
  { name: 'ui-boards-overview', route: `${project}/boards/stories` },
  {
    name: 'ui-boards-keyboard',
    route: `${project}/boards/stories`,
    steps: async (page, ctx) => {
      const card = page
        .getByTestId('board-card')
        .filter({ has: page.getByTestId('board-card-key').filter({ hasText: ctx.stories[0] }) });
      await card.focus();
      await page.keyboard.press('Alt+ArrowRight');
    },
  },
  {
    name: 'ui-boards-features-lanes',
    route: `${project}/boards/features`,
    steps: async (page) => {
      await page.locator('[data-testid="board-lanes-option"][data-option="epic"]').click();
      await page.getByTestId('board-lane').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-boards-rollups',
    route: `${project}/boards/features`,
    steps: async (page, ctx) => {
      await featureCard(page, ctx.features[0])
        .getByTestId('board-card-rollup')
        .and(page.locator('[data-type="story"]'))
        .click();
      await page.getByTestId('board-child-list').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-boards-done-confirm',
    route: `${project}/boards/features`,
    steps: async (page, ctx) => {
      await featureCard(page, ctx.features[0]).focus();
      // The default Feature board has a Resolved column before Closed.
      const resolved = page.waitForResponse(response => response.request().method() === 'POST' && /\/api\/boards\/[^/]+\/moves$/.test(new URL(response.url()).pathname));
      await page.keyboard.press('Alt+ArrowRight');
      if (!(await resolved).ok()) throw new Error('Cannot move the demo Feature into Resolved.');
      await featureCard(page, ctx.features[0]).focus();
      await page.keyboard.press('Alt+ArrowRight');
      await page.getByTestId('board-done-confirm').waitFor({ state: 'visible' });
    },
  },
  { name: 'ui-boards-epics', route: `${project}/boards/epics` },
];
