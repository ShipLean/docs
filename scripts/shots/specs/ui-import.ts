import type { Page } from 'playwright';
import type { SeedResult, ShotSpec } from '../types';

const jiraKey = 'PLATFORM';
const jiraUrl = 'https://example.atlassian.net';
const connectionId = 'docs-jira-connection';
const jobId = 'docs-jira-rerun';
// Jira-side reads are stubbed in this browser context only. No Jira credentials are saved and no import is started.
const mappedProject = (projectKey: string) => ({
  key: jiraKey,
  name: 'Platform Team',
  issueCount: 1342,
  importedAs: projectKey === '' ? null : {
    projectKey,
    jobId,
    finishedAt: '2026-10-24T10:00:00Z',
    finishedLabel: '3 days ago',
  },
});
const connection = (projectId: string) => ({
  id: connectionId,
  projectId,
  baseUrl: jiraUrl,
  kind: 'cloud',
  email: 'guide@example.test',
  tokenLastFour: '4fA2',
  createdBy: null,
  createdAt: '2026-10-24T10:00:00Z',
  createdLabel: '3 days ago',
});
const mapping = {
  issueTypes: [
    { jiraType: 'Story', count: 83, target: 'story', note: null, isNewSinceLastRun: false },
    { jiraType: 'Epic', count: 9, target: 'feature', note: null, isNewSinceLastRun: false },
  ],
  statuses: [
    { jiraType: 'Story', jiraStatus: 'Open', jiraCategory: 'new', count: 42, targetState: 'New', targetCategory: 'proposed', createsState: false, isNewSinceLastRun: false },
    { jiraType: 'Story', jiraStatus: 'In Progress', jiraCategory: 'indeterminate', count: 41, targetState: 'Active', targetCategory: 'inProgress', createsState: false, isNewSinceLastRun: false },
  ],
  users: [
    { jiraAccountId: 'demo-user', name: 'Demo User', email: 'guide@example.test', references: 20, resolution: 'create', user: null, isBot: false, isNewSinceLastRun: false },
  ],
  fields: {
    storyPointsFieldId: 'customfield_10016',
    candidates: [
      { fieldId: 'customfield_10016', name: 'Story point estimate', populated: 62, missing: 21 },
    ],
    includeComponents: true,
    includeComments: true,
    includeAttachments: false,
    includeChangelog: true,
  },
  totals: { issues: 92, comments: 140, attachments: 0, revisions: 524, sprints: 6, people: 4 },
  warnings: [],
};

async function mockJiraReads(page: Page, ctx: SeedResult, rerun: boolean) {
  await page.route(`**/api/projects/${ctx.projectId}/jira/connection`, (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: connection(ctx.projectId) })
      : route.fallback(),
  );
  await page.route(`**/api/projects/${ctx.projectId}/jira/connection/test`, (route) =>
    route.fulfill({
      json: { ok: true, who: { displayName: 'Demo Jira', email: 'guide@example.test' }, message: null },
    }),
  );
  await page.route(`**/api/projects/${ctx.projectId}/jira/projects`, (route) =>
    route.fulfill({ json: [mappedProject(rerun ? ctx.projectKey : '')] }),
  );
  await page.route('**/api/import/mapping', (route) => route.fulfill({ json: mapping }));
}

const projectRoute = '/p/DEMO/import';
const rerunRoute = `${projectRoute}?rerun=${jobId}&jira=${jiraKey}`;

export const shots: ShotSpec[] = [
  {
    name: 'ui-import-overview',
    route: projectRoute,
    steps: async (page, ctx) => {
      await mockJiraReads(page, ctx, false);
      await page.reload();
      await page.getByTestId('import-connection-panel').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-import-connection',
    route: projectRoute,
    steps: async (page, ctx) => {
      await mockJiraReads(page, ctx, false);
      await page.reload();
      await page.getByTestId('import-connection-panel').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-import-project',
    route: projectRoute,
    steps: async (page, ctx) => {
      await mockJiraReads(page, ctx, false);
      await page.reload();
      await page.getByTestId('import-test').click();
      await page.getByTestId('import-next').click();
      await page.getByTestId('import-projects-step').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-import-target',
    route: projectRoute,
    steps: async (page, ctx) => {
      await mockJiraReads(page, ctx, false);
      await page.reload();
      await page.getByTestId('import-test').click();
      await page.getByTestId('import-next').click();
      await page.locator('[data-testid="import-project-row"][data-key="PLATFORM"]').click();
      await page.getByTestId('import-next').click();
      await page.getByTestId('import-target-step').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-import-mapping',
    route: rerunRoute,
    steps: async (page, ctx) => {
      await mockJiraReads(page, ctx, true);
      await page.reload();
      await page.getByTestId('import-mapping-step').waitFor({ state: 'visible' });
    },
  },
  {
    name: 'ui-import-run',
    route: rerunRoute,
    steps: async (page, ctx) => {
      await mockJiraReads(page, ctx, true);
      await page.reload();
      await page.getByTestId('import-mapping-step').waitFor({ state: 'visible' });
      await page.getByTestId('import-next').click();
      await page.getByTestId('import-run-ready').waitFor({ state: 'visible' });
    },
  },
];
