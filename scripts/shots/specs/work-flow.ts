import type { SeedResult, ShotSpec } from '../types';

const feature = (ctx: SeedResult) => `/p/${ctx.projectKey}/items/${ctx.features[0]}`;

export const shots: ShotSpec[] = [
  {
    name: 'work-flow-example-feature',
    route: feature,
  },
];
