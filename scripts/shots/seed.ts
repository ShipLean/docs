import { createHash } from 'node:crypto';
import { request, type APIRequestContext, type APIResponse } from 'playwright';
import type { SeedResult } from './types.ts';

// This fixture owns its registered items, these attachment names, one sprint and the
// Stories board configuration. Other projects, items, attachments and capacity rows
// remain untouched. Screenshot steps must leave the registry attachment in place.
// The API keeps revisions/history and upload replacement metadata; derived time
// labels continue to age. Restoration covers editable state, not historical data.
// Retro points and Action items are made once and recorded in the registry. A reseed does not
// restore them, and a crash between creating one and saving the registry can leave a duplicate.
const registryName = 'demo-fixture.json';
const anchorSlug = 'guide-new-members';
const fixtureTag = 'docs-demo';
const captureDay = new Date().toISOString().slice(0, 10);
// The application allows 20 sign-ins per email in 15 minutes, including successes.
// Keep cookies in memory for this capture run; each seed still gets a fresh client.
const sessions = new Map<string, Awaited<ReturnType<APIRequestContext['storageState']>>>();

type ItemType = 'epic' | 'feature' | 'story' | 'bug' | 'task' | 'action';
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
interface Registry {
  version: 1; items: Record<string, string>; sprint?: string; boardColumns?: Record<string, string>;
  /** Sprint ids by fixture name: future, recent, older. Created once; a closed sprint cannot be reopened. */
  sprints?: Record<string, string>;
  /** Retro points, Action items and decisions by fixture name. A crash between a POST and the registry write can leave a duplicate, and a reseed does not restore a point or an Action item. */
  retro?: Record<string, string>;
}
type SprintName = 'current' | 'future' | 'recent' | 'older';
interface Fixture {
  name: string; type: ItemType; title: string; parent?: string; category: Category;
  points?: number; sprint?: boolean | SprintName; priority?: number; goal?: string; status?: string; description?: string;
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
// Appended after every older fixture so existing DEMO keys stay as they were.
// The backlog rows rank above the older unsprinted stories (see rankNames), so the
// first five total 8 points and the sixth has 2. The pull line and the Close sprint
// dialog's next-sprint total depend on them.
const backlogRows: Fixture[] = [
  ['Show the project key while it is typed', 2], ['Explain why a key cannot change', 1],
  ['Offer a sample first story', 2], ['Show the next action after the first story', 1],
  ['Let a teammate skip the tour', 2], ['Remember the last project opened', 2],
].map(([title, points], i) => ({
  name: `row-${i + 1}`, type: 'story', title: title as string, parent: i < 4 ? 'feature-4' : 'feature-1',
  category: 'proposed', points: points as number, priority: 2,
}));
// 13 points already in the future sprint.
const futureStories: Fixture[] = [
  ['Invite a teammate by email', 5], ['Show pending invitations', 5], ['Resend an invitation', 3],
].map(([title, points], i) => ({
  name: `next-${i + 1}`, type: 'story', title: title as string, parent: 'feature-2',
  category: 'proposed', points: points as number, sprint: 'future',
}));
// Finished in the most recent past sprint; they carry item-level retro points.
const retroStories: Fixture[] = [
  { name: 'done-1', type: 'story', title: 'Choose a project template', parent: 'feature-1', category: 'completed', points: 3, sprint: 'recent' },
  { name: 'done-2', type: 'story', title: 'Show progress on the Features board', parent: 'feature-6', category: 'completed', points: 2, sprint: 'recent' },
];
const fixtures = [...epics, ...features, ...stories, ...extras, ...backlogRows, ...futureStories, ...retroStories];

interface PointFixture { name: string; category: 'wentWell' | 'wentBadly' | 'improve' | 'notInPlan'; text: string; theme?: string; rootCause?: string; sprint?: SprintName; item?: string }
const themeCriteria = 'Unclear acceptance criteria';
const themeReviews = 'Slow reviews';
const retroPoints: PointFixture[] = [
  { name: 'older-well', sprint: 'older', category: 'wentWell', text: 'Pairing on the first project flow unblocked us quickly.' },
  { name: 'older-criteria', sprint: 'older', category: 'wentBadly', theme: themeCriteria, text: 'Stories started before the acceptance criteria were agreed.', rootCause: 'Refinement was skipped when the sprint filled up.' },
  { name: 'older-review-1', sprint: 'older', category: 'wentBadly', theme: themeReviews, text: 'Pull requests waited two days for a first review.', rootCause: 'One person reviewed everything.' },
  { name: 'older-review-2', sprint: 'older', category: 'notInPlan', theme: themeReviews, text: 'Review requests arrived during the planning meeting.' },
  { name: 'older-review-3', sprint: 'older', category: 'improve', theme: themeReviews, text: 'Agree a review rota at planning.' },
  { name: 'recent-well', sprint: 'recent', category: 'wentWell', text: 'The Stories board made blockers visible.' },
  { name: 'recent-criteria', sprint: 'recent', category: 'wentBadly', theme: themeCriteria, text: 'Two stories were reworked after the acceptance criteria changed.', rootCause: 'The criteria were written after the work began.' },
  { name: 'recent-invites', sprint: 'recent', category: 'notInPlan', theme: 'Invitation wording', text: 'The invitation email needed a new template.' },
  { name: 'recent-open', sprint: 'recent', category: 'improve', theme: themeCriteria, text: 'Write acceptance criteria in refinement, not during the sprint.' },
  { name: 'current-criteria', sprint: 'current', category: 'wentBadly', theme: themeCriteria, text: 'Estimates were missing at the start of planning.', rootCause: 'The criteria were still open.' },
  { name: 'done-1-badly', item: 'done-1', category: 'wentBadly', theme: themeCriteria, text: 'The template list changed halfway through the story.', rootCause: 'The criteria did not name the templates.' },
  { name: 'done-1-improve', item: 'done-1', category: 'improve', text: 'List the templates in the acceptance criteria.' },
  { name: 'done-2-well', item: 'done-2', category: 'wentWell', text: 'The Features board answered the first question we asked.' },
  { name: 'feature-1-improve', item: 'feature-1', category: 'improve', text: 'Keep the research next to the Feature.' },
];
// The Action item is raised from the review points and closed in the older sprint. The open one covers two criteria points.
// recent-open stays undecided.
const retroActions = [
  { name: 'action-closed', title: 'Set up a review rota', fixType: 'guide', points: ['older-review-1', 'older-review-2', 'older-review-3'], theme: themeReviews, parent: 'feature-4', sprint: 'older' as SprintName, closed: true, estimate: 3 },
  { name: 'action-open', title: 'Agree acceptance criteria in refinement', fixType: 'skill', points: ['older-criteria', 'recent-criteria'], theme: themeCriteria, parent: 'feature-1', sprint: undefined, closed: false, estimate: 2 },
];
// Rank order: the backlog rows sit before the older stories; everything else keeps its place.
const rankNames = [...epics, ...features, ...backlogRows, ...stories, ...extras, ...futureStories, ...retroStories].map(f => f.name);
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
    const day = (offset: number) => new Date(Date.parse(captureDay + 'T00:00:00Z') + offset * 86400000).toISOString().slice(0, 10);
    const sprintFixtures: Record<'future' | 'recent' | 'older', { name: string; start: number; end: number; goal: string }> = {
      future: { name: 'Invite and join', start: 12, end: 25, goal: 'Let invited teammates join the right project.' },
      recent: { name: 'Foundations', start: -14, end: -1, goal: 'Lay the groundwork for the first-project guide.' },
      older: { name: 'Discovery', start: -28, end: -15, goal: 'Learn where new members get stuck.' },
    };
    registry.sprints ??= {};
    registry.retro ??= {};
    const sprintIds = registry.sprints;
    const knownSprints = await json<{ id: string; name: string }[]>(api.get(`${projectPath}/sprints`));
    const ensureSprint = async (key: 'older' | 'recent' | 'future') => {
      const f = sprintFixtures[key];
      // Past sprints keep their dates; the future one follows the capture day so it never overlaps First steps.
      sprintIds[key] ??= knownSprints.find(s => s.name === f.name)?.id
        ?? (await json<{ id: string }>(api.post(`${projectPath}/sprints`, { data: { name: f.name, startDate: day(f.start), endDate: day(f.end), goal: f.goal } }))).id;
      await saveRegistry();
    };
    const sprintOf = (name: SprintName | boolean | undefined) => name === true || name === 'current' ? registry.sprint! : name ? sprintIds[name] : null;
    // Move the future sprint first: First steps may move later on a reseed, and the two must not overlap.
    await ensureSprint('future');
    await checked(await api.patch(`/api/sprints/${sprintIds.future}`, { data: { name: sprintFixtures.future.name, startDate: day(12), endDate: day(25), goal: sprintFixtures.future.goal } }));
    await checked(await api.patch(`/api/sprints/${registry.sprint}`, { data: sprintData }));
    // Create the past sprints only after First steps has moved, or an instance seeded on an earlier day
    // fails with "Sprints cannot overlap". A sprint that already exists keeps its dates.
    await ensureSprint('older');
    await ensureSprint('recent');
    const setCapacity = async (sprintId: string, velocity: number, note: string) => {
      const capacity = await json<{ members: { user: { id: string }; days: number | null; note: string | null }[] }>(api.get(`/api/sprints/${sprintId}/capacity`));
      await checked(await api.put(`/api/sprints/${sprintId}/capacity`, { data: { velocity, members: [
        ...capacity.members.filter(m => m.user.id !== me.id).map(m => ({ userId: m.user.id, days: m.days, note: m.note })),
        { userId: me.id, days: null, note },
      ] } }));
    };
    await setCapacity(registry.sprint!, 34, 'Leave room for support and review.');
    await setCapacity(sprintIds.future, 22, 'Keep a margin for support.');

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
      if (['story', 'bug', 'task'].includes(fixture.type)) changes.sprint = { value: sprintOf(fixture.sprint) };
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
          sprintId: sprintOf(fixture.sprint), changes,
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
    // Retro data. REST writes every point as the signed-in person: there is no route that writes an agent's retro.
    // Points and Action items have no natural key to find again. If the process stops between a POST and
    // saveRegistry, the next seed creates a second copy. A reseed also does not restore a point or an Action item
    // that a capture step edited or removed, because the ledger only records that it was made.
    const ledger = registry.retro;
    const pointIds: Record<string, string> = {};
    for (const point of retroPoints) {
      if (!ledger[point.name]) {
        const target = point.item ? { workItemId: items[point.item].id, sprintId: null } : { workItemId: null, sprintId: sprintOf(point.sprint) };
        ledger[point.name] = (await json<{ id: string }>(api.post(`${projectPath}/retros/points`, { data: {
          retroId: null, ...target, category: point.category, text: point.text,
          rootCause: point.rootCause ?? null, themeId: null, themeName: point.theme ?? null,
        } }))).id;
        await saveRegistry();
      }
      pointIds[point.name] = ledger[point.name];
    }
    // A point that needs no action, so the Retro tab shows a decided progress below 100%.
    if (!ledger['not-needed:recent-invites']) {
      await checked(await api.post(`/api/retros/points/${pointIds['recent-invites']}/not-needed`, { data: { reason: 'The template is already planned.' } }));
      ledger['not-needed:recent-invites'] = 'done';
      await saveRegistry();
    }
    for (const action of retroActions) {
      if (!ledger[action.name]) {
        const made = await json<{ action: { workItemId: string } }>(api.post(`${projectPath}/retros/actions`, { data: {
          title: action.title, fixType: action.fixType, pointIds: action.points.map(n => pointIds[n]), themeId: null, themeName: action.theme,
        } }));
        ledger[action.name] = made.action.workItemId;
        await saveRegistry();
      }
      registry.items[action.name] = ledger[action.name];
      if (!ledger[`placed:${action.name}`]) {
        // The retro route makes the item in New with no parent or sprint. Place it, then close it in the sprint it belongs to.
        // The placed: ledger entry means a later seed skips this block, so it does not put back edits to the item.
        const created = await json<Item>(api.get(`/api/work-items/${ledger[action.name]}`));
        const placed = await json<{ id: string }>(api.patch(`/api/work-items/${created.id}`, { data: { expectedRevision: created.revision, changes: {
          parent: { value: items[action.parent].id }, sprint: { value: sprintOf(action.sprint) }, points: { value: action.estimate },
          assignee: { value: me.id }, priority: { value: 2 },
          tags: { value: [fixtureTag, 'process'] }, state: { value: state('action', 'proposed') },
        } } }));
        const current = await json<Item>(api.get(`/api/work-items/${placed.id}`));
        await checked(await api.patch(`/api/work-items/${current.id}`, { data: { expectedRevision: current.revision, changes: {
          state: { value: state('action', action.closed ? 'completed' : 'inProgress') },
        } } }));
        ledger[`placed:${action.name}`] = 'done';
        await saveRegistry();
      }
      items[action.name] = await json<Item>(api.get(`/api/work-items/${ledger[action.name]}`));
    }
    await saveRegistry();
    // Close the two past sprints (rolling over nothing: everything in them is finished). A closed sprint cannot be reopened.
    const sprintList = await json<{ id: string; rolloverStatus: string | null }[]>(api.get(`${projectPath}/sprints`));
    for (const key of ['older', 'recent'] as const) {
      if (sprintList.find(s => s.id === sprintIds[key])?.rolloverStatus?.toLowerCase() !== 'decided') {
        await checked(await api.post(`/api/sprints/${sprintIds[key]}/rollover`, { data: { moves: [] } }));
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
      // An Action item has no Resolved state, so its In review column repeats Active, as the product's default board does.
      stateMappings: (['story', 'bug', 'action'] as const).map(type => ({ type, stateId: state(type, type === 'action' && category === 'resolved' ? 'inProgress' : category) })),
    }));
    const settings = {
      columns: [...columns, ...loaded.settings.columns.filter(c => !Object.values(columnIds).includes(c.id))],
      swimlanes: [
        { id: 'demo-expedite', name: 'Expedite', colour: 'danger', kind: 'criteria', criteria: { match: 'all', clauses: [{ field: 'priority', op: '=', value: 1 }] } },
        { id: 'lane-default', name: 'Everything else', colour: null, kind: 'default', criteria: null },
      ],
      cardFields: ['story', 'bug', 'action'].map(type => ({ type, showKey: true, showAssignee: true, showTags: true, showPoints: true, showEmptyFields: false, extraFields: ['priority'] })),
      styleRules: [{ id: 'demo-priority', name: 'Urgent work', enabled: true, colour: 'danger', bold: false, italic: false, underline: false, criteria: { match: 'all', clauses: [{ field: 'priority', op: '=', value: 1 }] } }],
      tagColours: [{ tag: 'onboarding', colour: 'info' }, { tag: 'quality', colour: 'warn' }],
      annotations: { tasks: true, stories: false, bugs: false, features: false },
      cardReordering: 'keepsBacklogOrder',
    };
    await checked(await api.put(`/api/boards/${board.id}/settings`, { data: { basedOn: loaded.settings, settings } }));
    // Restore board placement and both backlog/column ordering after mutating shots.
    const ranked = await json<Item[]>(api.get(`${projectPath}/work-items`));
    const orderedNames = [...rankNames, ...retroActions.map(a => a.name)];
    const orderedIds = orderedNames.map(n => items[n].id);
    if (ranked.filter(i => managedIds.has(i.id)).some((item, index) => item.id !== orderedIds[index])) {
      for (const name of orderedNames) {
        const item = await json<Item>(api.get(`/api/work-items/${items[name].id}`));
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
      stories: stories.map(f => items[f.name].key), sprint: registry.sprint!, boardId: board.id,
      futureSprint: sprintIds.future, recentSprint: sprintIds.recent, olderSprint: sprintIds.older,
      backlogRows: backlogRows.map(f => items[f.name].key), futureStories: futureStories.map(f => items[f.name].key),
      retroStories: retroStories.map(f => items[f.name].key), actionItems: retroActions.map(a => items[a.name].key),
    };
  } finally {
    await api.dispose();
  }
}
