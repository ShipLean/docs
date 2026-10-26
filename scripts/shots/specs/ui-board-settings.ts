import type { ShotSpec } from '../types';

const board = '/p/DEMO/boards/stories?settings=';

const pane = (section: string, testId: string): ShotSpec => ({
  name: `ui-board-settings-${section}`,
  route: `${board}${section}`,
  steps: async (page) => {
    await page.getByTestId(testId).waitFor({ state: 'visible' });
  },
});

export const shots: ShotSpec[] = [
  pane('columns', 'pane-columns'),
  pane('fields', 'pane-fields'),
  pane('styles', 'pane-styles'),
  pane('tags', 'pane-tags'),
  pane('annotations', 'pane-annotations'),
  pane('swimlanes', 'pane-swimlanes'),
  pane('reordering', 'pane-reordering'),
];
