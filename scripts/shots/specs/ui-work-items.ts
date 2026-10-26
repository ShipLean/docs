import type { SeedResult, ShotSpec } from '../types';

const story = (index: number) => (ctx: SeedResult) =>
  `/p/${ctx.projectKey}/items/${ctx.stories[index]}`;

async function showConflict(page: Parameters<NonNullable<ShotSpec['steps']>>[0], ctx: SeedResult) {
  const key = ctx.stories[0];
  if (!key) throw new Error('The demo seed has no Story for the conflict capture.');

  // This deliberately creates one competing revision. The next seed restores the visible fixture values; history is append-only.
  await page.getByTestId('work-item-title').fill('A draft title to keep');
  const savedByTeammate = await page.evaluate(async ({ projectId, itemKey }) => {
    const workItemPath = `/api/projects/${encodeURIComponent(projectId)}/work-items/by-key/${encodeURIComponent(itemKey)}`;
    const found = await fetch(workItemPath, { credentials: 'same-origin' });
    if (!found.ok) return { ok: false, status: found.status };
    const item = (await found.json()) as { id: string; revision: number };
    const saved = await fetch(`/api/work-items/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-ShipLean-Client': 'docs-ui-work-items-conflict',
      },
      body: JSON.stringify({
        expectedRevision: item.revision,
        changes: { title: { value: 'A teammate saved this first' } },
      }),
    });
    return { ok: saved.ok, status: saved.status };
  }, { projectId: ctx.projectId, itemKey: key });

  if (!savedByTeammate.ok) {
    throw new Error(`The demo item could not be updated for the conflict capture (${savedByTeammate.status}).`);
  }
  await page.getByTestId('work-item-save').click();
  await page.getByTestId('work-item-conflict').waitFor({ state: 'visible' });
}

export const shots: ShotSpec[] = [
  {
    name: 'ui-work-items-overview',
    route: story(0),
  },
  {
    name: 'ui-work-items-markdown',
    route: story(0),
    steps: async (page) => {
      await page.getByTestId('work-item-description-edit').click();
      await page.getByTestId('work-item-description-input').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-work-items-task-form',
    route: story(0),
    steps: async (page) => {
      await page.getByTestId('work-item-task-add').click();
      await page.getByTestId('work-item-task-form').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-work-items-link-form',
    route: story(3),
    steps: async (page) => {
      await page.getByTestId('work-item-link-add').click();
      await page.getByTestId('work-item-link-form').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-work-items-history',
    route: story(0),
    steps: async (page) => {
      await page.getByTestId('work-item-history').waitFor({ state: 'visible' });
      await page.getByTestId('work-item-revision').first().waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-work-items-conflict',
    route: story(0),
    steps: showConflict,
  },
];
