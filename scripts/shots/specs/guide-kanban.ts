import type { ShotSpec } from '../types';
import { shots as settingsShots } from './ui-board-settings';

const columns = settingsShots.find((shot) => shot.name === 'ui-board-settings-columns');
if (!columns) throw new Error('The board columns reference spec is missing.');

export const shots: ShotSpec[] = [
  { ...columns, name: 'guide-kanban-columns' },
  { name: 'guide-kanban-wip', route: '/p/DEMO/boards/stories' },
  { ...columns, name: 'guide-kanban-split' },
  { ...columns, name: 'guide-kanban-dod' },
];
