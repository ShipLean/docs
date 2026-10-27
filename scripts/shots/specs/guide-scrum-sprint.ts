import type { ShotSpec } from '../types';
import { shots as sprintBacklogShots } from './ui-sprint-backlog';

export const shots: ShotSpec[] = [
  {
    name: 'guide-scrum-capacity',
    route: (ctx) => `/p/${ctx.projectKey}/sprints/${ctx.sprint}/capacity`,
  },
  { name: 'guide-scrum-planning', route: '/p/DEMO/backlogs/stories?mode=planning' },
  {
    name: 'guide-scrum-taskboard',
    route: (ctx) => `/p/${ctx.projectKey}/sprints/${ctx.sprint}/taskboard`,
  },
  { ...sprintBacklogShots[2], name: 'guide-scrum-rollover' },
];
