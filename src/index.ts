export { MetricsGathererError } from './metrics-gatherer.ts';

import { MetricsGatherer } from './metrics-gatherer.ts';
export type { MetricsGatherer };
export const metrics = new MetricsGatherer();
