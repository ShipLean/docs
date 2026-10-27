import type { ShotSpec } from '../types';

const settings = '/p/DEMO/settings';

export const shots: ShotSpec[] = [
  { name: 'ui-project-settings-overview', route: `${settings}/general` },
  { name: 'ui-project-settings-general', route: `${settings}/general` },
  { name: 'ui-project-settings-states', route: `${settings}/states` },
  { name: 'ui-project-settings-members', route: `${settings}/members` },
  { name: 'ui-project-settings-sprints', route: `${settings}/sprints` },
  { name: 'ui-project-settings-integrations', route: `${settings}/integrations` },
];
