import type { ShotSpec } from '../types';

// Consent is bound to a live OAuth authorization request. A synthetic request ID captures
// the error state, so the page keeps its explicit screenshot placeholder until a real local
// registered-client flow can be prepared by the screenshot pipeline.
export const shots: ShotSpec[] = [
  { name: 'ui-authorize-overview', route: '/authorize' },
  { name: 'ui-authorize-review', route: '/authorize' },
];
