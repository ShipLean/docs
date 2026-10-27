import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'work-build-overview',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/taskboard`,
  },
];
