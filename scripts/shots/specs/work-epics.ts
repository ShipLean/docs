import type { SeedResult, ShotSpec } from '../types';

const epics = (ctx: SeedResult) => `/p/${ctx.projectKey}/backlogs/epics`;
const featuresBoard = (ctx: SeedResult) => `/p/${ctx.projectKey}/boards/features`;

export const shots: ShotSpec[] = [
  {
    name: 'work-epics-backlog',
    route: epics,
  },
  {
    name: 'work-epics-features-board',
    route: featuresBoard,
  },
];
