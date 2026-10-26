import type { ShotSpec } from '../types';

const planning = '/p/DEMO/backlogs/stories?mode=planning';

export const shots: ShotSpec[] = [
  { name: 'ui-planning-overview', route: planning },
  { name: 'ui-planning-forecast', route: planning },
  {
    name: 'ui-planning-capacity',
    route: (ctx) => `/p/DEMO/sprints/${ctx.sprint}/capacity`,
  },
  { name: 'ui-planning-velocity-window', route: '/p/DEMO/settings/sprints' },
];
