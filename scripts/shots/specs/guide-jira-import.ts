import type { ShotSpec } from '../types';
import { shots as importShots } from './ui-import';

export const shots: ShotSpec[] = importShots.map((shot) => ({
  ...shot,
  name: shot.name.replace('ui-import-', 'guide-jira-'),
}));
