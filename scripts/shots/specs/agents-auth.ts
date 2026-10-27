import type { ShotSpec } from '../types';
import { shots as consentShots } from './ui-authorize';

export const shots: ShotSpec[] = [
  { ...consentShots[0], name: 'agents-auth-consent' },
];
