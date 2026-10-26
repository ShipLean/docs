import { createHash } from 'node:crypto';
import { request, type APIRequestContext, type APIResponse } from 'playwright';
import type { SeedResult } from './types.ts';

// This fixture owns its registered items, these attachment names, one sprint and the
// Stories board configuration. Other projects, items, attachments and capacity rows
// remain untouched. Screenshot steps must leave the registry attachment in place.
// The API keeps revisions/history and upload replacement metadata; derived time
// labels continue to age. Restoration covers editable state, not historical data.
const registryName = 'demo-fixture.json';
const anchorSlug = 'guide-new-members';
const fixtureTag = 'docs-demo';
const captureDay = new Date().toISOString().slice(0, 10);
// The application allows 20 sign-ins per email in 15 minutes, including successes.
// Keep cookies in memory for this capture run; each seed still gets a fresh client.
const sessions = new Map<string, Awaited<ReturnType<APIRequestContext['storageState']>>>();

type ItemType = 'epic' | 'feature' | 'story' | 'bug' | 'task';
type Category = 'proposed' | 'inProgress' | 'resolved' | 'completed';
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
interface Item {
  id: string; projectId: string; key: string; title: string; revision: number; slug: string | null;
  type: { id: ItemType }; tags: string[];
  links: { id: string; type: string; workItemId: string | null; url: string | null }[];
}
interface Project { id: string; key: string; nextItemNumber: number }
interface State { id: string; type: ItemType; category: string; order: number }
interface Attachment { id: string; name: string; downloadUrl: string }
interface Registry { version: 1; items: Record<string, string>; sprint?: string; boardColumns?: Record<string, string> }
interface Fixture {
  name: string; type: ItemType; title: string; parent?: string; category: Category;
  points?: number; sprint?: boolean; priority?: number; goal?: string; status?: string; description?: string;
}

const epics: Fixture[] = ['Onboarding', 'Planning', 'Team collaboration'].map((title, i) => ({
  name: `epic-${i + 1}`, type: 'epic', title, category: 'inProgress',
  description: ['Help new teammates find their way and take a useful first step.', 'Keep plans small, ordered and within the team’s available capacity.', 'Keep decisions, evidence and progress visible to everyone.'][i],
}));
// Sitewide running example: features[0] and its purpose are part of the shared contract.
const features: Fixture[] = [
  { name: 'feature-1', type: 'feature', parent: 'epic-1', category: 'inProgress',
    title: 'Guide new members through their first project',
    goal: 'help a new member create their first project and find the next action.',
    status: 'Research complete. The first-project guide is being built and tested.' },
  { name: 'feature-2', type: 'feature', parent: 'epic-1', category: 'proposed',
    title: 'Make invitations easy to understand', goal: 'Help invited teammates join the right project.' },
  { name: 'feature-3', type: 'feature', parent: 'epic-2', category: 'inProgress',
    title: 'Plan a sprint with confidence', goal: 'Make the next sprint fit the team’s available capacity.' },
  { name: 'feature-4', type: 'feature', parent: 'epic-2', category: 'proposed',
    title: 'Keep the backlog focused', goal: 'Help the team find the most valuable next story.' },
  { name: 'feature-5', type: 'feature', parent: 'epic-3', category: 'inProgress',
    title: 'Keep decisions with the work', goal: 'Let teammates find the evidence behind each decision.' },
  { name: 'feature-6', type: 'feature', parent: 'epic-3', category: 'completed',
    title: 'Make progress visible', goal: 'Show the team what has moved forward and what needs help.' },
];
const storyTitles = [
  'Create a project with a memorable key', 'Add an Epic for the team’s area',
  'Capture the first Feature and its goal', 'Find the next action after signing in',
  'Explain what an invitation gives access to', 'Join a project from an invitation',
  'Show who is already on the team', 'Enter the team’s sprint capacity',
  'Estimate a story in points', 'Move selected stories into a sprint',
  'See remaining room while planning', 'Rank the next stories in the backlog',
  'Filter stories by tag and owner', 'Review ideas that need a decision',
  'Attach research to a Feature', 'Link related work items',
  'Record a decision in the discussion', 'See progress on the Stories board',
  'Check completed work before closing a sprint', 'Find the team’s current focus',
];
const storyParents = [1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6];
const categories: Category[] = ['inProgress', 'proposed', 'resolved', 'completed'];
const stories: Fixture[] = storyTitles.map((title, i) => ({
  name: `story-${i + 1}`, type: 'story', title, parent: `feature-${storyParents[i]}`,
  category: categories[i % categories.length], points: [3, 5, 2, 1, 3][i % 5],
  sprint: i < 10, priority: i % 7 === 0 ? 1 : 2,
}));
const extras: Fixture[] = [
  { name: 'bug-1', type: 'bug', title: 'Keep the project key when validation fails', parent: 'feature-1', category: 'inProgress', points: 2, sprint: true, priority: 1 },
  { name: 'bug-2', type: 'bug', title: 'Show an empty capacity row clearly', parent: 'feature-3', category: 'proposed', points: 1, sprint: true },
  { name: 'task-1', type: 'task', title: 'Write the project creation checklist', parent: 'story-1', category: 'completed', sprint: true },
  { name: 'task-2', type: 'task', title: 'Review the empty project screen', parent: 'story-1', category: 'inProgress', sprint: true },
  { name: 'task-3', type: 'task', title: 'Check keyboard access to the next action', parent: 'story-4', category: 'proposed', sprint: true },
  { name: 'task-4', type: 'task', title: 'Try the sprint plan with sample estimates', parent: 'story-10', category: 'proposed', sprint: true },
];
const fixtures = [...epics, ...features, ...stories, ...extras];
const attachments = [
  { fixture: 'feature-1', name: 'first-project-research.md', content: '# First-project research\n\n## Findings\n\nA new member needs a clear project key, a small first story and an obvious next action.\n\n## Decision\n\nStart with project creation, then introduce an Epic, a Feature and its first stories. Keep the next action visible.\n\n## Next\n\nTry the guide with a new teammate and record where they hesitate.\n' },
  { fixture: 'feature-1', name: 'first-project-plan.md', content: '# First-project plan\n\n1. Create the project and explain its key.\n2. Add the team’s area as an Epic.\n3. Capture a Feature with a clear goal.\n4. Add and estimate the first stories.\n5. Choose the next action on the board.\n\nSuccess means a new member can create their first project and find the next action.\n' },
  { fixture: 'feature-3', name: 'sprint-planning-notes.md', content: '# Sprint planning notes\n\nEnter capacity before selecting stories. Compare estimates with the available room and keep a small margin for support work.\n' },
];

async function checked(response: APIResponse): Promise<APIResponse> {
  if (!response.ok()) {
    // Never include request bodies (especially the sign-in password) in an error.
    throw new Error(`Demo seed: ${new URL(response.url()).pathname} returned ${response.status()}: ${await response.text()}`);
  }
  return response;
}
async function json<T>(response: Promise<APIResponse>): Promise<T> {
  return (await checked(await response)).json() as Promise<T>;
}
async function upload(api: APIRequestContext, itemId: string, name: string, content: string) {
  const existing = await json<Attachment[]>(api.get(`/api/work-items/${itemId}/attachments`));
  const attachment = existing.find(a => a.name === name);
  if (attachment && await (await checked(await api.get(attachment.downloadUrl))).text() === content) return;
  await checked(await api.post(`/api/work-items/${itemId}/attachments`, {
    multipart: { file: { name, mimeType: name.endsWith('.json') ? 'application/json' : 'text/markdown', buffer: Buffer.from(content) } },
  }));
}

/** Restore the managed DEMO fixture using only the published application's REST API. */
export async function seedDemo(baseUrl: string, admin: { email: string; password: string }): Promise<SeedResult> {
  const url = new URL(baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Demo seed requires a loopback application origin for a disposable local instance.');
  }
  // Different credentials must authenticate separately, even for the same email.
  const cacheKey = createHash('sha256').update(JSON.stringify([url.origin, admin.email, admin.password])).digest('hex');
  const cached = sessions.get(cacheKey);
  const api = await request.newContext({
    baseURL: url.origin, maxRedirects: 0, storageState: cached,
    extraHTTPHeaders: { 'X-ShipLean-Client': 'docs-demo-seed' },
  });
  try {
    const signIn = async () => {
      sessions.delete(cacheKey);
      await checked(await api.post('/api/auth/login', { data: admin }));
      sessions.set(cacheKey, await api.storageState());
    };
    if (!cached) await signIn();
    let meResponse = await api.get('/api/me');
    if (cached && meResponse.status() === 401) {
      // A revoked/expired session gets one normal reauthentication attempt.
      await signIn();
      meResponse = await api.get('/api/me');
    }
    const me = await json<{ id: string }>(Promise.resolve(meResponse));
    const projects = await json<Project[]>(api.get('/api/projects'));
    const project = projects.find(p => p.key === 'DEMO')
      ? await json<Project>(api.get('/api/projects/by-key/DEMO'))
      : await json<Project>(api.post('/api/projects', { data: {
        name: 'Demo workspace', key: 'DEMO', copyFromProjectId: null,
        memberEmails: [], workingDays: [1, 2, 3, 4, 5], firstSprint: null,
      } }));
    const projectPath = `/api/projects/${project.id}`;
    const live = await json<Item[]>(api.get(`${projectPath}/work-items`));
    let anchor = live.find(i => i.slug === anchorSlug);
    // The ordinary list excludes Removed items. Immutable slugs plus direct key
    // reads let us recover even a removed/renamed/retagged running-example Feature.
    if (!anchor) {
      for (let n = 1; n < project.nextItemNumber; n++) {
        const response = await api.get(`${projectPath}/work-items/by-key/DEMO-${n}`);
        if (response.status() === 404) continue;
        const item = await json<Item>(Promise.resolve(response));
        if (item.slug === anchorSlug) { anchor = item; break; }
      }
    }
    let registry: Registry = { version: 1, items: {} };
    if (anchor) {
      const list = await json<Attachment[]>(api.get(`/api/work-items/${anchor.id}/attachments`));
      const stored = list.find(a => a.name === registryName);
      if (stored) {
        registry = await json<Registry>(api.get(stored.downloadUrl));
        if (registry.version !== 1 || !registry.items || Object.values(registry.items).some(id => typeof id !== 'string')) {
          throw new Error('Demo fixture registry is invalid; leave its reserved attachment intact.');
        }
      }
      if (!stored && !anchor.tags.includes(fixtureTag)) {
        throw new Error(`DEMO already has an unrelated Feature with the reserved slug ${anchorSlug}.`);
      }
      registry.items['feature-1'] = anchor.id;
    }
    let savedRegistry = '';
    const saveRegistry = async () => {
      const content = JSON.stringify(registry, null, 2) + '\n';
      if (registry.items['feature-1'] && content !== savedRegistry) {
        await upload(api, registry.items['feature-1'], registryName, content);
        savedRegistry = content;
      }
    };
    const states = await json<State[]>(api.get(`${projectPath}/states`));
    const state = (type: ItemType, category: Category) => {
      const found = states.filter(s => s.type === type && s.category === category).sort((a, b) => a.order - b.order)[0];
      if (!found) throw new Error(`DEMO needs a ${category} state for ${type}.`);
      return found.id;
    };
    const sprintData = {
      name: 'First steps', startDate: captureDay,
      endDate: new Date(Date.parse(captureDay + 'T00:00:00Z') + 11 * 86400000).toISOString().slice(0, 10),
      goal: 'Help a new member create their first project and find the next action.',
    };
    if (!registry.sprint) {
      // A matching goal recovers a creation interrupted before the registry write.
      const sprints = await json<{ id: string; name: string; goal: string }[]>(api.get(`${projectPath}/sprints`));
      registry.sprint = sprints.find(s => s.name === sprintData.name && s.goal === sprintData.goal)?.id
        ?? (await json<{ id: string }>(api.post(`${projectPath}/sprints`, { data: sprintData }))).id;
      await saveRegistry();
    }
    await checked(await api.patch(`/api/sprints/${registry.sprint}`, { data: sprintData }));
    const capacity = await json<{ members: { user: { id: string }; points: number; note: string | null }[] }>(api.get(`/api/sprints/${registry.sprint}/capacity`));
    await checked(await api.put(`/api/sprints/${registry.sprint}/capacity`, { data: { members: [
      ...capacity.members.filter(m => m.user.id !== me.id).map(m => ({ userId: m.user.id, points: m.points, note: m.note })),
      { userId: me.id, points: 34, note: 'Leave room for support and review.' },
    ] } }));

    const items: Record<string, Item> = {};
    for (const fixture of fixtures) {
      const existing = registry.items[fixture.name]
        ? await json<Item>(api.get(`/api/work-items/${registry.items[fixture.name]}`))
        : live.find(i => i.tags.includes(fixtureTag) && i.type.id === fixture.type && i.title === fixture.title);
      if (existing && (existing.type.id !== fixture.type || existing.projectId !== project.id)) throw new Error(`Demo registry type mismatch for ${fixture.name}.`);
      const parent = fixture.parent ? items[fixture.parent].id : null;
      const changes: Record<string, unknown> = {
        title: { value: fixture.title },
        description: { value: fixture.description ?? (fixture.type === 'feature'
          ? '## Key facts and decisions\n\nKeep the first step small and the next action clear.\n\n## Next\n\nTry this with a teammate and record what needs to change.'
          : `Help the team ${fixture.title.charAt(0).toLowerCase() + fixture.title.slice(1)}.`) },
        state: { value: state(fixture.type, fixture.category) }, parent: { value: parent },
        assignee: { value: fixture.category === 'proposed' ? null : me.id },
        priority: { value: fixture.priority ?? 2 }, points: { value: fixture.points ?? null },
        tags: { value: [fixtureTag, fixture.type === 'bug' ? 'quality' : 'onboarding'] },
      };
      if (['story', 'bug', 'task'].includes(fixture.type)) changes.sprint = { value: fixture.sprint ? registry.sprint : null };
      if (fixture.type === 'feature') {
        changes.goal = { value: fixture.goal };
        changes.statusLine = { value: fixture.status ?? (fixture.category === 'completed' ? 'Delivered. The team can see its progress.' : 'Ready for the next research and planning session.') };
      }
      if (fixture.type === 'story') changes.acceptanceCriteria = { value: [
        { text: 'A new member can complete the step without help.', done: fixture.category === 'completed' },
        { text: 'The next action is clear.', done: fixture.category === 'completed' },
      ] };
      if (fixture.type === 'bug') {
        changes.severity = { value: 3 };
        changes.reproSteps = { value: '1. Open the form.\n2. Submit an incomplete value.\n3. Check that the entered information is kept and the error is clear.' };
      }
      const written = existing
        ? await json<{ id: string }>(api.patch(`/api/work-items/${existing.id}`, { data: { expectedRevision: existing.revision, changes } }))
        : await json<{ id: string }>(api.post('/api/work-items', { data: {
          projectId: project.id, type: fixture.type, title: fixture.title, parentId: parent,
          sprintId: fixture.sprint ? registry.sprint : null, changes,
          ...(fixture.type === 'feature' ? { slug: fixture.name === 'feature-1' ? anchorSlug : `demo-${fixture.name}`, startedOn: captureDay } : {}),
        } }));
      registry.items[fixture.name] = written.id;
      items[fixture.name] = await json<Item>(api.get(`/api/work-items/${written.id}`));
      await saveRegistry();
    }
    for (const a of attachments) await upload(api, items[a.fixture].id, a.name, a.content);

    // Only links within the managed set are restored; links to unrelated work stay.
    const desiredLinks = [
      { from: 'story-4', to: 'story-1', type: 'blockedBy' },
      { from: 'story-8', to: 'story-9', type: 'related' },
      { from: 'bug-1', to: 'story-1', type: 'related' },
    ];
    const managedIds = new Set(Object.values(registry.items));
    for (const fixture of fixtures) {
      const item = await json<Item>(api.get(`/api/work-items/${items[fixture.name].id}`));
      const desired = desiredLinks.filter(l => l.from === fixture.name);
      const removeLinkIds = item.links.filter(l => l.workItemId && managedIds.has(l.workItemId)
        && !desired.some(d => items[d.to].id === l.workItemId && d.type === l.type)).map(l => l.id);
      if (removeLinkIds.length) await checked(await api.patch(`/api/work-items/${item.id}`, { data: { expectedRevision: item.revision, changes: { removeLinkIds } } }));
      for (const link of desired) {
        if (!item.links.some(l => l.workItemId === items[link.to].id && l.type === link.type)) {
          await checked(await api.post(`/api/work-items/${item.id}/work-item-links`, { data: { targetKey: items[link.to].key, type: link.type } }));
        }
      }
    }
    const boards = await json<{ id: string; level: string }[]>(api.get(`${projectPath}/boards`));
    const board = boards.find(b => b.level === 'stories');
    if (!board) throw new Error('DEMO has no Stories board.');
    const loaded = await json<{ settings: { [key: string]: Json } & { columns: { id: string; stateMappings: { type: ItemType; stateId: string }[] }[] } }>(api.get(`/api/boards/${board.id}/settings`));
    const boardCategories: Category[] = ['proposed', 'inProgress', 'resolved', 'completed'];
    if (!registry.boardColumns) {
      registry.boardColumns = Object.fromEntries(boardCategories.map(category => {
        const column = loaded.settings.columns.find(c => c.stateMappings.some(m => m.type === 'story' && m.stateId === state('story', category)));
        if (!column) throw new Error(`The Stories board needs its original ${category} column.`);
        return [category, column.id];
      }));
      await saveRegistry();
    }
    const columnIds = registry.boardColumns;
    const columns = boardCategories.map((category, i) => ({
      id: columnIds[category], name: ['Ready', 'In progress', 'In review', 'Done'][i],
      wipLimit: i === 1 ? 5 : i === 2 ? 3 : null, split: i === 1,
      definitionOfDone: ['The goal and acceptance criteria are clear.', 'The change is ready for review.', 'A teammate has reviewed the work.', 'The acceptance criteria are met.'][i],
      stateMappings: (['story', 'bug'] as const).map(type => ({ type, stateId: state(type, category) })),
    }));
    const settings = {
      columns: [...columns, ...loaded.settings.columns.filter(c => !Object.values(columnIds).includes(c.id))],
      swimlanes: [
        { id: 'demo-expedite', name: 'Expedite', colour: 'danger', kind: 'criteria', criteria: { match: 'all', clauses: [{ field: 'priority', op: '=', value: 1 }] } },
        { id: 'lane-default', name: 'Everything else', colour: null, kind: 'default', criteria: null },
      ],
      cardFields: ['story', 'bug'].map(type => ({ type, showKey: true, showAssignee: true, showTags: true, showPoints: true, showEmptyFields: false, extraFields: ['priority'] })),
      styleRules: [{ id: 'demo-priority', name: 'Urgent work', enabled: true, colour: 'danger', bold: false, italic: false, underline: false, criteria: { match: 'all', clauses: [{ field: 'priority', op: '=', value: 1 }] } }],
      tagColours: [{ tag: 'onboarding', colour: 'info' }, { tag: 'quality', colour: 'warn' }],
      annotations: { tasks: true, stories: false, bugs: false, features: false },
      cardReordering: 'keepsBacklogOrder',
    };
    await checked(await api.put(`/api/boards/${board.id}/settings`, { data: { basedOn: loaded.settings, settings } }));
    // Restore board placement and both backlog/column ordering after mutating shots.
    const ranked = await json<Item[]>(api.get(`${projectPath}/work-items`));
    const orderedIds = fixtures.map(f => items[f.name].id);
    if (ranked.filter(i => managedIds.has(i.id)).some((item, index) => item.id !== orderedIds[index])) {
      for (const fixture of fixtures) {
        const item = await json<Item>(api.get(`/api/work-items/${items[fixture.name].id}`));
        await checked(await api.post(`/api/work-items/${item.id}/reorder`, { data: { expectedRevision: item.revision, beforeItemId: null } }));
      }
    }
    for (const fixture of [...stories, ...extras.filter(f => f.type === 'bug')]) {
      const item = await json<Item>(api.get(`/api/work-items/${items[fixture.name].id}`));
      await checked(await api.post(`/api/boards/${board.id}/moves`, { data: {
        itemId: item.id, expectedRevision: item.revision, columnId: columnIds[fixture.category], done: false,
        laneId: fixture.priority === 1 ? 'demo-expedite' : 'lane-default', beforeItemId: null,
      } }));
    }
    await saveRegistry();
    return {
      projectKey: 'DEMO', projectId: project.id,
      epics: epics.map(f => items[f.name].key), features: features.map(f => items[f.name].key),
      stories: stories.map(f => items[f.name].key), sprint: registry.sprint, boardId: board.id,
    };
  } finally {
    await api.dispose();
  }
}
