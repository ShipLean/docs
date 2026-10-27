import type { ShotSpec } from '../types';
import { showStories } from './ui-taskboard';

export const shots: ShotSpec[] = [
  {
    name: 'work-build-overview',
    steps: showStories,
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/taskboard`,
  },
];
