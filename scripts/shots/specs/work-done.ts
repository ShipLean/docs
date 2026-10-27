import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'work-done-overview',
    route: (ctx) => `/p/DEMO/items/${ctx.features[0]}`,
    steps: async (page, ctx) => {
      // Complete only the running example and its managed descendants. The next
      // ordinary capture restores their editable values; history remains visible.
      const origin = new URL(page.url()).origin;
      const itemsResponse = await page.request.get(`${origin}/api/projects/${ctx.projectId}/work-items`);
      const statesResponse = await page.request.get(`${origin}/api/projects/${ctx.projectId}/states`);
      if (!itemsResponse.ok() || !statesResponse.ok()) throw new Error('Cannot load the completion fixture.');
      type Item = { id: string; key: string; revision: number; type: { id: string }; parent: { id: string } | null; tags: string[] };
      const items = await itemsResponse.json() as Item[];
      const states = await statesResponse.json() as { id: string; type: string; category: string }[];
      const feature = items.find(item => item.key === ctx.features[0]);
      if (!feature) throw new Error('The running example Feature is missing.');
      const descendants = items.filter(item => item.tags.includes('docs-demo') && item.parent?.id === feature.id);
      const descendantIds = new Set(descendants.map(item => item.id));
      const tasks = items.filter(item => item.tags.includes('docs-demo') && item.parent && descendantIds.has(item.parent.id));
      for (const item of [...tasks, ...descendants, feature]) {
        const state = states.find(state => state.type === item.type.id && state.category === 'completed');
        if (!state) throw new Error('The demo workflow has no Completed state.');
        const current = await page.request.get(`${origin}/api/work-items/${item.id}`);
        if (!current.ok()) throw new Error('Cannot read the demo completion revision.');
        const changes = {
          state: { value: state.id },
          ...(item.id === feature.id ? {
            statusLine: { value: 'Delivered. New members can create their first project and find the next action.' },
            description: { value: '## Outcome\n\nThe first-project guide is complete. New members can create a project and find the next action.\n\n## What to change next time\n\nKeep the first task small and check the guide with a teammate before expanding it.' },
          } : {}),
        };
        const saved = await page.request.patch(`${origin}/api/work-items/${item.id}`, { data: { expectedRevision: (await current.json()).revision, changes } });
        if (!saved.ok()) throw new Error(`Cannot complete the demo item (${saved.status()}).`);
      }
      await page.reload();
      await page.getByTestId('feature-status-state').filter({ hasText: 'Closed' }).waitFor({ state: 'visible' });
    },
  },
];
