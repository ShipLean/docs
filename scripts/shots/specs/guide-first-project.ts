import type { ShotSpec } from '../types';

const project = '/p/DEMO';

export const shots: ShotSpec[] = [
  { name: 'guide-first-project-create', route: '/projects/new' },
  { name: 'guide-first-project-epics', route: `${project}/backlogs/epics` },
  { name: 'guide-first-project-stories', route: `${project}/backlogs/stories` },
  { name: 'guide-first-project-board', route: `${project}/boards/stories` },
  { name: 'guide-first-project-sprint', route: `${project}/backlogs/stories?mode=planning` },
];
