import { MetricsGatherer } from './metrics-gatherer';

const commonLabels = ['queueName', 'userAgent', 'apiVersion'];

const serviceTimePercentiles = [0.5, 0.9, 0.99, 0.999, 1.0];
const serviceTimeBuckets = [
	4,
	16,
	50,
	100,
	250,
	500,
	1000,
	1500,
	3000,
	8000,
	10000,
	20000,
	30000,
];

let described = false;

export const describeAPIMetricsOnce = (metrics: MetricsGatherer) => {
	if (described) {
		return;
	}
	described = true;

	metrics.describe.counter(
		'api_status_code_total',
		'number of requests with each status code',
		{
			labelNames: [...commonLabels, 'state', 'statusCode'],
		},
	);

	metrics.describe.histogram(
		'api_duration_milliseconds_hist',
		'histogram of time spent in different phases of request handling',
		{
			buckets: serviceTimeBuckets,
			labelNames: [...commonLabels, 'phase', 'state', 'statusCode'],
		},
	);

	metrics.describe.summary(
		'api_duration_milliseconds_summary',
		'percentiles of time taken to service requests to the api',
		{
			percentiles: serviceTimePercentiles,
			labelNames: [...commonLabels, 'phase', 'state', 'statusCode'],
		},
	);

	metrics.describe.summary(
		'api_duration_milliseconds_all_summary',
		'percentiles of time taken to service requests to the api, across all queues',
		{
			percentiles: serviceTimePercentiles,
			labelNames: ['state'],
		},
	);

	metrics.describe.counter(
		'api_arrival_total',
		'number of arrivals to the api queues',
		{
			labelNames: [...commonLabels],
		},
	);

	metrics.describe.counter(
		'api_failure_total',
		'number of failed requests, labeled by cause',
		{
			labelNames: [...commonLabels, 'cause'],
		},
	);

	metrics.describe.counter(
		'api_completion_total',
		'number of requests departing the api',
		{
			labelNames: [...commonLabels, 'state'],
		},
	);
};
