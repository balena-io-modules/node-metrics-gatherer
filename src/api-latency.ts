import { NextFunction, Request, Response } from 'express';
import * as onFinished from 'on-finished';

import { MetricsGatherer } from './metrics-gatherer';

const reqEndState = (req: Request): string => {
	if (req.aborted) {
		return 'aborted';
	}
	if (req.queueFailState) {
		return req.queueFailState;
	}
	return 'completed';
};

// observe various metrics given a finished request
const sampleRequestLatency = (
	metrics: MetricsGatherer,
	t0: ReturnType<typeof process.hrtime>,
	req: Request,
	res: Response,
) => {
	const diff = process.hrtime(t0);
	const state = reqEndState(req);
	const statusCode = state === 'completed' ? String(res.statusCode) : state;
	const latency = diff[0] * 1000 + diff[1] / 1e6;
	metrics.histogramSummary('api_duration_milliseconds', latency, {
		...req.metricsLabels,
		phase: 'total',
		state,
		statusCode,
	});
	// observe a second summary without any labels, for
	// *all requests* (summaries are impossible to aggregate into a
	// "total" like this once they're already observed into separately-
	// -labeled summaries
	metrics.summary('api_duration_milliseconds_all_summary', latency, {
		state,
	});
	metrics.counter('api_status_code_total', 1, {
		...req.metricsLabels,
		state,
		statusCode,
	});
	metrics.counter('api_completion_total', 1, {
		...req.metricsLabels,
		state,
	});
};

export const latencyMetricsMiddleware = (metrics: MetricsGatherer) => {
	return (req: Request, res: Response, next: NextFunction) => {
		metrics.counter('api_arrival_total', 1, req.metricsLabels);
		const t0 = process.hrtime();
		onFinished(res, () => {
			sampleRequestLatency(metrics, t0, req, res);
		});
		next();
	};
};
