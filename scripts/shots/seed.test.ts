import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { request, type APIResponse } from 'playwright';
import { seedDemo } from './seed.ts';
import type { SeedResult } from './types.ts';

// Run either the brief's CLI:
//   pnpm tsx scripts/shots/seed.test.ts <url> <email> <password>
// or, without credentials in argv/history:
//   SHIPLEAN_SEED_RUNTIME_FILE=/private/runtime.json pnpm test:seed
// The JSON file contains { baseUrl, admin: { email, password } }.
const [url, email, password] = process.argv.slice(2);
const config = process.env.SHIPLEAN_SEED_RUNTIME_FILE
  ? JSON.parse(await readFile(process.env.SHIPLEAN_SEED_RUNTIME_FILE, 'utf8'))
  : { baseUrl: url, admin: { email, password } };
if (!config.baseUrl || !config.admin?.email || !config.admin?.password) {
  throw new Error('Seed integration tests need <url> <email> <password> or SHIPLEAN_SEED_RUNTIME_FILE. Use a disposable local instance.');
}

async function body(response: APIResponse) {
  assert.ok(response.ok(), `${new URL(response.url()).pathname}: HTTP ${response.status()} ${response.ok() ? '' : await response.text()}`);
  return response.status() === 204 ? undefined : response.json();
}

await test('Demo REST fixture on a disposable runtime', { timeout: 180_000 }, async t => {
  const api = await request.newContext({ baseURL: config.baseUrl, maxRedirects: 0, extraHTTPHeaders: { 'X-ShipLean-Client': 'docs-demo-seed' } });
  try {
    await body(await api.post('/api/auth/login', { data: config.admin }));
    const first: SeedResult = await seedDemo(config.baseUrl, config.admin);
    const projectPath = `/api/projects/${first.projectId}`;
    const getItems = async () => body(await api.get(`${projectPath}/work-items`));
    const getItem = async (key: string) => body(await api.get(`${projectPath}/work-items/by-key/${key}`));
    const patch = async (item: { id: string; revision: number }, changes: object) => body(await api.patch(`/api/work-items/${item.id}`, {
      data: { expectedRevision: item.revision, changes },
    }));
    const managed = (items: any[]) => items.filter(i => i.tags.includes('docs-demo'));
    const snapshot = async () => {
      const items = managed(await getItems());
      return Promise.all(items.map(async item => ({
        id: item.id, key: item.key, title: item.title, description: item.description,
        type: item.type.id, state: item.state.id, assignee: item.assignee?.id ?? null,
        priority: item.priority, points: item.points, tags: item.tags, goal: item.goal,
        statusLine: item.statusLine, parent: item.parent?.id ?? null, sprint: item.sprint?.id ?? null,
        acceptanceCriteria: item.acceptanceCriteria, reproSteps: item.reproSteps, severity: item.severity,
        columnId: item.position.columnId, done: item.position.done, laneId: item.position.laneId,
        links: item.links.map((l: any) => ({ type: l.type, workItemId: l.workItemId, url: l.url })).sort((a: any, b: any) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        attachments: (await body(await api.get(`/api/work-items/${item.id}/attachments`)))
          .filter((a: any) => a.name !== 'unrelated-note.md')
          .map((a: any) => ({ name: a.name, sizeBytes: a.sizeBytes })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
      }))).then(items => items.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })));
    };
    const boardSettings = async () => (await body(await api.get(`/api/boards/${first.boardId}/settings`))).settings;
    const capacity = async () => body(await api.get(`/api/sprints/${first.sprint}/capacity`));
    const sprint = async () => (await body(await api.get(`${projectPath}/sprints`))).find((s: any) => s.id === first.sprint);
    const baseline = await snapshot();
    const initialBoard = await boardSettings();
    const initialCapacity = await capacity();
    const initialSprint = await sprint();
    const managedOrder = async () => managed(await getItems()).map(i => i.key);
    const initialOrder = await managedOrder();
    const retroPointsBefore = (await Promise.all([first.olderSprint, first.recentSprint, first.sprint]
      .map(async id => (await body(await api.get(`/api/sprints/${id}/retro`))).cards.flatMap((c: any) => c.points)))).flat().length;
    const featureAttachment = async (name: string) => {
      const feature = await getItem(first.features[0]);
      const list = await body(await api.get(`/api/work-items/${feature.id}/attachments`));
      return list.find((a: any) => a.name === name);
    };
    const initialResearch = await (await api.get((await featureAttachment('first-project-research.md')).downloadUrl)).text();

    await t.test('Seed_WhenRun_ShouldReturnTheDeclaredShape', async () => {
      assert.deepEqual(Object.keys(first).sort(), ['projectKey', 'projectId', 'epics', 'features', 'stories', 'sprint', 'boardId', 'futureSprint', 'recentSprint', 'olderSprint', 'backlogRows', 'futureStories', 'retroStories', 'actionItems'].sort());
      assert.equal(first.projectKey, 'DEMO');
      const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
      for (const id of [first.projectId, first.sprint, first.boardId, first.futureSprint, first.recentSprint, first.olderSprint]) assert.match(id, uuid);
      for (const [keys, count, type] of [[first.epics, 3, 'epic'], [first.features, 6, 'feature'], [first.stories, 20, 'story']] as const) {
        assert.equal(keys.length, count);
        assert.equal(new Set(keys).size, count);
        for (const key of keys) {
          assert.match(key, /^DEMO-\d+$/);
          assert.equal((await getItem(key)).type.id, type);
        }
      }
      const feature = await getItem(first.features[0]);
      assert.equal(feature.title, 'Guide new members through their first project');
      assert.equal(feature.goal, 'help a new member create their first project and find the next action.');
      assert.ok(feature.statusLine.length > 0);
      assert.ok(feature.statusVerified);
      // 35 older items, 6 backlog rows, 3 future-sprint stories, 2 finished stories and 2 Action items.
      assert.equal(baseline.length, 48);
      assert.equal(baseline.filter(i => i.type === 'bug').length, 2);
      assert.equal(baseline.filter(i => i.type === 'task').length, 4);
      assert.ok(baseline.filter(i => i.type === 'story').every(i => i.points !== null));
      assert.equal(baseline.filter(i => i.type === 'story' && i.sprint === first.sprint).length, 10);
      assert.equal(initialBoard.swimlanes.length, 2);
      assert.ok(initialBoard.columns.some((c: any) => c.wipLimit && c.split));
      assert.ok(initialCapacity.teamTotal >= 34);
      const boards = await body(await api.get(`${projectPath}/boards`));
      assert.equal(boards.find((b: any) => b.id === first.boardId).level, 'stories');
      assert.equal(baseline.reduce((n, i) => n + i.links.length, 0), 3);
      assert.equal(baseline.reduce((n, i) => n + i.attachments.length, 0), 4);
    });

    await t.test('Seed_WhenRun_ShouldPlanAFutureSprintAndRankSixBacklogRows', async () => {
      const sprints = await body(await api.get(`${projectPath}/sprints`));
      const future = sprints.find((s: any) => s.id === first.futureSprint);
      assert.ok(future.startDate > initialSprint.endDate, 'the future sprint starts after First steps ends');
      assert.equal((await body(await api.get(`/api/sprints/${first.futureSprint}/capacity`))).teamTotal, 22);
      const items = managed(await getItems());
      const inFuture = items.filter(i => i.sprint?.id === first.futureSprint);
      assert.equal(inFuture.length, 3);
      assert.equal(inFuture.reduce((n, i) => n + i.points, 0), 13);
      const rows = [] as any[];
      for (const key of first.backlogRows) rows.push(await getItem(key));
      assert.equal(rows.length, 6);
      assert.ok(rows.every(r => r.type.id === 'story' && r.sprint === null && r.parent && r.points > 0));
      assert.equal(rows.slice(0, 5).reduce((n, r) => n + r.points, 0), 8);
      assert.ok(rows[5].points >= 2);
      // They rank above every other unsprinted story, in order.
      const backlog = items.filter(i => i.type.id === 'story' && !i.sprint).map(i => i.key);
      assert.deepEqual(backlog.slice(0, 6), first.backlogRows);
      // The new keys come after the older fixtures, so the older keys did not move.
      const number = (key: string) => Number(key.split('-')[1]);
      assert.ok(first.backlogRows.every(key => number(key) > Math.max(...first.stories.map(number))));
    });

    await t.test('Seed_WhenRun_ShouldSeedClosedSprintsWithRetroPointsThemesAndActionItems', async () => {
      const sprints = await body(await api.get(`${projectPath}/sprints`));
      for (const id of [first.olderSprint, first.recentSprint]) {
        const closed = sprints.find((s: any) => s.id === id);
        assert.ok(closed.endDate < initialSprint.startDate, 'a past sprint ended before First steps');
        assert.equal(String(closed.rolloverStatus).toLowerCase(), 'decided');
      }
      const pointsOf = async (id: string) => (await body(await api.get(`/api/sprints/${id}/retro`))).cards.flatMap((c: any) => c.points);
      const older = await pointsOf(first.olderSprint);
      const recent = await pointsOf(first.recentSprint);
      const all = [...older, ...recent];
      for (const category of ['wentWell', 'wentBadly', 'improve', 'notInPlan']) {
        assert.ok(all.some((p: any) => p.category === category), `a ${category} point exists`);
      }
      assert.ok(all.every((p: any) => p.author.user.id && p.author.role === 'person'));
      // The same theme carries wentBadly points in both past sprints, which makes it recurring with the current sprint's point.
      const themes = (sprint: any[]) => new Set(sprint.filter(p => p.category === 'wentBadly').map(p => p.theme?.name));
      assert.ok(themes(older).has('Unclear acceptance criteria') && themes(recent).has('Unclear acceptance criteria'));
      assert.ok(all.some((p: any) => p.category !== 'wentWell' && !p.decision && !p.notNeeded && !p.action), 'one point is still to decide');
      assert.ok(all.some((p: any) => p.action));
      assert.equal(first.actionItems.length, 2);
      const closedAction = await getItem(first.actionItems[0]);
      const openAction = await getItem(first.actionItems[1]);
      assert.equal(closedAction.type.id, 'action');
      assert.equal(closedAction.state.category, 'completed');
      assert.equal(closedAction.sprint.id, first.olderSprint);
      assert.ok(closedAction.parent && openAction.parent);
      assert.notEqual(openAction.state.category, 'completed');
    });

    await t.test('Seed_WhenCredentialsDiffer_ShouldNotReuseAnAuthenticatedSession', async () => {
      await assert.rejects(seedDemo(config.baseUrl, { email: config.admin.email, password: config.admin.password + '-incorrect' }), /auth\/login returned 401/);
    });

    await t.test('Seed_WhenRunTwice_ShouldNotDuplicateTheProjectOrManagedContent', async () => {
      const second = await seedDemo(config.baseUrl, config.admin);
      assert.deepEqual(second, first);
      assert.deepEqual(await snapshot(), baseline);
      const retroPointCount = async () => (await Promise.all([first.olderSprint, first.recentSprint, first.sprint]
        .map(async id => (await body(await api.get(`/api/sprints/${id}/retro`))).cards.flatMap((c: any) => c.points)))).flat().length;
      assert.equal(await retroPointCount(), retroPointsBefore, 'a reseed adds no retro point');
      assert.deepEqual(await boardSettings(), initialBoard);
      const projects = await body(await api.get('/api/projects'));
      assert.equal(projects.filter((p: any) => p.key === 'DEMO').length, 1);
      assert.equal((await body(await api.get(`${projectPath}/sprints`))).filter((s: any) => s.id === first.sprint).length, 1);
    });

    await t.test('Seed_WhenManagedStateChanges_ShouldRestoreItAndPreserveUnrelatedData', async () => {
      // This repeatable unrelated item is deliberately outside the seed's registry.
      const all = await getItems();
      let unrelated = all.find((i: any) => i.tags.includes('seed-test-preserve'));
      if (!unrelated) {
        const created = await body(await api.post('/api/work-items', { data: {
          projectId: first.projectId, type: 'story', title: 'Keep this unrelated work item', parentId: null, sprintId: null,
          changes: { tags: { value: ['seed-test-preserve'] } },
        } }));
        unrelated = await getItem(created.key);
      }
      const unrelatedBefore = await getItem(unrelated.key);
      const feature = await getItem(first.features[0]);
      await body(await api.post(`/api/work-items/${feature.id}/attachments`, { multipart: {
        file: { name: 'unrelated-note.md', mimeType: 'text/markdown', buffer: Buffer.from('# Keep this unrelated note\n') },
      } }));
      const note = (await body(await api.get(`/api/work-items/${feature.id}/attachments`))).find((a: any) => a.name === 'unrelated-note.md');
      await patch(feature, {
        title: { value: 'Mutated title' }, description: { value: 'Mutated description' },
        goal: { value: 'Mutated goal' }, statusLine: { value: 'Mutated status' }, tags: { value: ['changed'] },
      });
      const story = await getItem(first.stories[0]);
      await patch(story, { title: { value: 'Changed story' }, points: { value: 13 }, priority: { value: 4 }, parent: { value: null }, sprint: { value: null } });
      const changedStory = await getItem(first.stories[0]);
      await body(await api.post(`/api/boards/${first.boardId}/moves`, { data: {
        itemId: changedStory.id, expectedRevision: changedStory.revision,
        columnId: initialBoard.columns[2].id, laneId: 'lane-default', beforeItemId: null, done: false,
      } }));
      const lastStory = await getItem(first.stories.at(-1)!);
      await body(await api.post(`/api/work-items/${lastStory.id}/reorder`, { data: {
        expectedRevision: lastStory.revision, beforeItemId: changedStory.id,
      } }));
      await body(await api.post(`/api/work-items/${feature.id}/attachments`, { multipart: {
        file: { name: 'first-project-research.md', mimeType: 'text/markdown', buffer: Buffer.from('Changed research') },
      } }));
      const linkedStory = await getItem(first.stories[3]);
      await patch(linkedStory, { removeLinkIds: linkedStory.links.map((l: any) => l.id) });
      await body(await api.post(`/api/work-items/${changedStory.id}/work-item-links`, { data: {
        targetKey: first.stories[5], type: 'related',
      } }));
      const removed = await getItem(first.stories[1]);
      await body(await api.post(`/api/work-items/${removed.id}/remove`, { data: { expectedRevision: removed.revision } }));
      // Remove the anchor too: its immutable slug still identifies its registry.
      const anchor = await getItem(first.features[0]);
      await body(await api.post(`/api/work-items/${anchor.id}/remove`, { data: { expectedRevision: anchor.revision } }));
      const modifiedBoard = structuredClone(initialBoard);
      modifiedBoard.swimlanes[0].name = 'Changed lane';
      modifiedBoard.columns[1].wipLimit = 9;
      await body(await api.put(`/api/boards/${first.boardId}/settings`, { data: { basedOn: initialBoard, settings: modifiedBoard } }));
      await body(await api.patch(`/api/sprints/${first.sprint}`, { data: { name: 'Changed sprint', goal: 'Changed goal' } }));
      const changedCapacity = initialCapacity.members.map((m: any) => ({ userId: m.user.id, days: 1, note: 'Changed' }));
      await body(await api.put(`/api/sprints/${first.sprint}/capacity`, { data: { velocity: 10, members: changedCapacity } }));
      const restored = await seedDemo(config.baseUrl, config.admin);
      assert.deepEqual(restored, first);
      assert.deepEqual(await snapshot(), baseline);
      assert.deepEqual(await boardSettings(), initialBoard);
      assert.deepEqual(await capacity(), initialCapacity);
      assert.deepEqual(await sprint(), initialSprint);
      assert.deepEqual(await managedOrder(), initialOrder);
      assert.equal(await (await api.get((await featureAttachment('first-project-research.md')).downloadUrl)).text(), initialResearch);
      // Ordering tokens can be rebalanced by the API when another card moves.
      // They are opaque; the unrelated item's fields and revision must not change.
      const { backlogOrder: beforeOrder, createdAtLabel: beforeCreatedLabel, changedAtLabel: beforeChangedLabel, ...beforeFields } = unrelatedBefore;
      const { backlogOrder: afterOrder, createdAtLabel: afterCreatedLabel, changedAtLabel: afterChangedLabel, ...afterFields } = await getItem(unrelated.key);
      assert.deepEqual(afterFields, beforeFields);
      const remaining = await body(await api.get(`/api/work-items/${feature.id}/attachments`));
      assert.equal(remaining.find((a: any) => a.name === 'unrelated-note.md').id, note.id);
      assert.equal(await (await api.get(note.downloadUrl)).text(), '# Keep this unrelated note\n');
      assert.equal(managed(await getItems()).length, 48);
    });
  } finally {
    await api.dispose();
  }
});
