import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'work-cadence-overview',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/backlog`,
  },
];
