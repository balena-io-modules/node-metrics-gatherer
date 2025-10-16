import type { MetricsGatherer } from '../../metrics-gatherer';

import { bytesRWBuckets, latencyBuckets } from '../../config';

// some or none of these labels may be actually used in the calls to observe
// metrics data points, but we need to specify them all up-front so that
// they don't appear by "surprise" to the prometheus client library, which will
// cause a thrown error. See: https://github.com/siimon/prom-client/issues/298
const commonLabels = [
	'queueName',
	'userAgent',
	'apiVersion',
	'state',
	'statusCode',
];

let described = false;

export const describeAPIMetricsOnce = (metrics: MetricsGatherer) => {
	if (described) {
		return;
	}
	described = true;

	metrics.describe.counter(
		'api_arrival_total',
		'number of arrivals to the api',
		{
			labelNames: [...commonLabels],
		},
	);

	metrics.describe.histogram(
		'api_bytes_read',
		'histogram of bytes read on the socket for each request',
		{
			buckets: bytesRWBuckets,
			labelNames: [...commonLabels],
		},
	);

	metrics.describe.histogram(
		'api_bytes_written',
		'histogram of bytes written on the socket for each request',
		{
			buckets: bytesRWBuckets,
			labelNames: [...commonLabels],
		},
	);

	metrics.describe.histogram(
		'api_latency_seconds',
		'histogram of time spent to process a request from arrival to completion',
		{
			buckets: latencyBuckets,
			labelNames: [...commonLabels],
		},
	);
};
