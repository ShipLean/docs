import type { ShotSpec } from '../types';

export const shots: ShotSpec[] = [
  {
    name: 'work-done-overview',
    route: (ctx) => `/p/DEMO/items/${ctx.features[0]}`,
  },
];
