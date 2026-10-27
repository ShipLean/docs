import type { ShotSpec } from '../types';
import { shots as newProjectShots } from './ui-new-project';

const project = '/p/DEMO';

export const shots: ShotSpec[] = [
  { ...newProjectShots[1], name: 'guide-first-project-create' },
  { name: 'guide-first-project-epics', route: `${project}/backlogs/epics` },
  { name: 'guide-first-project-stories', route: `${project}/backlogs/stories` },
  { name: 'guide-first-project-board', route: `${project}/boards/stories` },
  { name: 'guide-first-project-sprint', route: `${project}/backlogs/stories?mode=planning` },
];
