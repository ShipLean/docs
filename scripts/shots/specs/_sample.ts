import type { ShotSpec } from '../types';

/** Explicit public smoke capture; excluded from normal discovery. */
export const shots: ShotSpec[] = [{ name: 'ui-sample-sign-in', route: '/login' }];
