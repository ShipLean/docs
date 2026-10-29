import type { ShotSpec } from '../types';
import { showTeamCapacity } from '../capacity-demo';
import { shots as sprintBacklogShots } from './ui-sprint-backlog';
import { showStories } from './ui-taskboard';

export const shots: ShotSpec[] = [
  {
    name: 'guide-scrum-capacity',
    steps: showTeamCapacity,
    route: (ctx) => `/p/${ctx.projectKey}/sprints/${ctx.sprint}/capacity`,
  },
  { name: 'guide-scrum-planning', route: '/p/DEMO/backlogs/stories?mode=planning' },
  {
    name: 'guide-scrum-taskboard',
    steps: showStories,
    route: (ctx) => `/p/${ctx.projectKey}/sprints/${ctx.sprint}/taskboard`,
  },
  { ...sprintBacklogShots[2], name: 'guide-scrum-rollover' },
];
