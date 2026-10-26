import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'ui-sprint-backlog-overview',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/backlog`,
  },
  {
    name: 'ui-sprint-backlog-burndown',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/backlog`,
  },
  {
    name: 'ui-sprint-backlog-rollover',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/backlog`,
    steps: async (page, ctx) => {
      const ended = {
        id: ctx.sprint,
        name: 'Sprint 19',
        startDate: '2026-10-19',
        endDate: '2026-10-25',
        goal: 'Finish the first project guide',
        status: 'past',
        rolloverStatus: null,
        datesLabel: '19 Oct – 25 Oct',
        timeLabel: 'Ended 2 days ago',
      };
      await page.route(`**/api/projects/${ctx.projectId}/sprints`, (route) =>
        route.fulfill({ json: [ended] }),
      );
      await page.route(`**/api/sprints/${ctx.sprint}/metrics`, (route) =>
        route.fulfill({
          json: {
            sprintId: ctx.sprint,
            committed: 21,
            completed: 10,
            remaining: 11,
            burndown: [],
          },
        }),
      );
      await page.route(`**/api/sprints/${ctx.sprint}/rollover`, (route) =>
        route.fulfill({
          json: {
            sprint: { id: ctx.sprint, name: ended.name, status: 'past' },
            status: 'pending',
            items: [
              {
                workItemId: '00000000-0000-4000-8000-000000000001',
                key: ctx.stories[0],
                title: 'Create a project with a memorable key',
                type: 'story',
                state: {
                  id: '00000000-0000-4000-8000-000000000002',
                  name: 'Active',
                  category: 'inProgress',
                },
                assignee: null,
                points: 5,
                openTasks: 1,
                totalTasks: 2,
                defaultTargetSprintId: null,
              },
            ],
            nextSprint: { id: '00000000-0000-4000-8000-000000000003', name: 'Sprint 20', status: 'current' },
            nextSprintCapacity: 35,
            nextSprintPoints: 18,
          },
        }),
      );
      await page.reload();
      await page.getByTestId('dialog').waitFor({ state: 'visible' });
      await page.getByTestId('sprints-end-row').waitFor({ state: 'visible' });
    },
  },
];
