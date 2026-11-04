import type { ShotSpec } from '../types';

const retros = '/p/DEMO/retros';

export const shots: ShotSpec[] = [
  {
    name: 'ui-retrospectives-search',
    route: retros,
    steps: async (page) => {
      await page.getByTestId('retros-rows').waitFor({ state: 'visible' });
      // Opening a row puts its retro in the panel on the right.
      await page.getByTestId('retros-row').first().click();
      await page.getByTestId('retros-selected').getByTestId('retro-note').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-retrospectives-features',
    route: `${retros}/features`,
    steps: async (page) => {
      await page.getByTestId('retro-features-row').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-retrospectives-insights-recurring',
    route: `${retros}/insights?view=themes&range=6`,
    steps: async (page) => {
      await page.getByTestId('retro-recurring-table').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-retrospectives-insights-actions',
    route: `${retros}/insights?view=actions&range=6`,
    steps: async (page) => {
      await page.getByTestId('retro-actions-table').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-retrospectives-insights-impact',
    route: `${retros}/insights?view=impact&range=6`,
    steps: async (page) => {
      await page.getByTestId('retro-impact-card').first().waitFor({ state: 'visible' });
    },
  },
];
