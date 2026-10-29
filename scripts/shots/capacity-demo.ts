import type { Page } from 'playwright';
import type { SeedResult } from './types.ts';

interface Member { user: { id: string; name: string; initials: string; avatarColour: string; photoUrl: string | null }; days: number | null; points: number; note: string | null }

// The demo project has one member and no internet, so its capacity page has no team and no holidays. These screenshots
// show a team of three with a public holiday in the sprint by adjusting what the page reads. The capacity formula is the
// product's: velocity / people * days / working days, two decimals, with days defaulting to working days minus holidays.
export async function showTeamCapacity(page: Page, ctx: SeedResult): Promise<void> {
  const people = [
    { id: '00000000-0000-4000-8000-0000000000a1', name: 'Priya Nair', initials: 'PN', avatarColour: '#6f7f5a', photoUrl: null },
    { id: '00000000-0000-4000-8000-0000000000a2', name: 'Sam Okafor', initials: 'SO', avatarColour: '#8a6a4f', photoUrl: null },
  ];
  await page.route(`**/api/projects/${ctx.projectId}/members`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: [...body, ...people.map((user) => ({ user, email: `${user.name.split(' ')[0].toLowerCase()}@example.com`, role: 'member', status: 'active' }))],
    });
  });
  await page.route(`**/api/sprints/${ctx.sprint}/capacity`, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    const body = await response.json();
    const day = new Date(Date.now() + 3 * 86400000);
    while ([0, 6].includes(day.getUTCDay())) day.setUTCDate(day.getUTCDate() + 1);
    const defaultDays = body.workingDays - 1;
    const share = (days: number) => Math.round(body.velocity * Math.min(days, body.workingDays) * 100 / (3 * body.workingDays)) / 100;
    const members: Member[] = [
      { ...body.members[0], days: null, points: share(defaultDays) },
      { user: people[0], days: null, points: share(defaultDays), note: null },
      { user: people[1], days: 4, points: share(4), note: 'Away for the first week' },
    ];
    await route.fulfill({
      response,
      json: {
        ...body, members, defaultDays, holidayCountry: 'AU',
        holidays: [{ date: day.toISOString().slice(0, 10), name: 'Public holiday' }],
        teamTotal: Math.round(members.reduce((sum, m) => sum + m.points, 0) * 100) / 100,
      },
    });
  });
  await page.reload();
  await page.getByTestId('sprints-capacity-total').waitFor({ state: 'visible' });
}
