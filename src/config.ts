import { exponentialBuckets } from 'prom-client';

// from 4 ms up to ~65 seconds, sqrt2 factor
// allows specification via env-var as comma-separated values
export const latencyBuckets =
	process.env['NODE_METRICS_GATHERER_LATENCY_BUCKETS']
		?.split(',')
		.map(s => parseInt(s, 10)) ??
	exponentialBuckets(0.004, Math.SQRT2, 29).map(Math.round);

// from 256 bytes up to 4GB, sqrt2 factor
// allows specification via env-var as comma-separated values
export const bytesRWBuckets =
	process.env['NODE_METRICS_GATHERER_BYTES_RW_BUCKETS']
		?.split(',')
		.map(s => parseInt(s, 10)) ??
	exponentialBuckets(256, Math.SQRT2, 49).map(Math.round);
