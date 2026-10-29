import type { Page } from 'playwright';
import type { SeedResult, ShotSpec } from '../types';

const settings = '/p/DEMO/settings';

// The demo server has no internet, so it holds no holiday data. These screenshots show a short country list and Australia chosen.
const showHolidayCountries = async (page: Page, ctx: SeedResult) => {
  await page.route('**/api/holidays/countries', (route) => route.fulfill({
    json: [{ code: 'AU', name: 'Australia' }, { code: 'CA', name: 'Canada' }, { code: 'NZ', name: 'New Zealand' }, { code: 'GB', name: 'United Kingdom' }],
  }));
  await page.route(`**/api/projects/${ctx.projectId}/settings`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({ response, json: { ...body, general: { ...body.general, holidayCountry: 'AU' } } });
  });
  await page.reload();
  await page.getByTestId('settings-holiday-country').waitFor({ state: 'visible' });
  await page.getByTestId('settings-holidays-panel').scrollIntoViewIfNeeded();
};

export const shots: ShotSpec[] = [
  { name: 'ui-project-settings-overview', route: `${settings}/general` },
  { name: 'ui-project-settings-general', route: `${settings}/general` },
  { name: 'ui-project-settings-holidays', route: `${settings}/general`, steps: showHolidayCountries },
  { name: 'ui-project-settings-states', route: `${settings}/states` },
  { name: 'ui-project-settings-members', route: `${settings}/members` },
  { name: 'ui-project-settings-sprints', route: `${settings}/sprints` },
  { name: 'ui-project-settings-integrations', route: `${settings}/integrations` },
];
