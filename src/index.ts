export { MetricsGathererError } from './metrics-gatherer';

import { MetricsGatherer } from './metrics-gatherer';
export { MetricsGatherer };

// extend global to hold a instance of MetricsGatherer
const symbol = Symbol.for(MetricsGatherer.name);
interface Global extends NodeJS.Global {
	[symbol]: MetricsGatherer;
}
declare const global: Global;

// export instance from global if exists else create a new one
export let metrics: MetricsGatherer;
if (!global[symbol]) {
	metrics = new MetricsGatherer();
	global[symbol] = exports.metrics;
} else {
	metrics = global[symbol];
}

export { AggregatorStrategy } from './enums';
