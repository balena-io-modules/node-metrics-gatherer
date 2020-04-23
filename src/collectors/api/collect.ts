import { NextFunction, Request, Response } from 'express';
import * as onFinished from 'on-finished';

import { MetricsGatherer } from '../../metrics-gatherer';
import { describeAPIMetricsOnce } from './describe';

export const collectAPIMetrics = (
	metrics: MetricsGatherer,
): ((req: Request, res: Response, next: NextFunction) => void) => {
	describeAPIMetricsOnce(metrics);

	// it may be necessary to modify the request object in various ways, this can
	// be done in this function. For example, a `_metrics_gatherer` object is
	// added to req and req.connection for the purposes of metrics observing functions
	const modifyReq = (req: Request) => {
		req._metrics_gatherer = {
			labels: {},
		};
		if (!req.connection._metrics_gatherer) {
			req.connection._metrics_gatherer = {};
		}
	};

	// A specific sequence of steps is used to keep track of the changing values of
	// req.connection.bytesRead and req.connection.bytesWritten
	//
	// These two quantities are observed when the request arrives and when it
	// has finished to subtract the difference, rather than simply observing them
	// when the request has finished, because the net.Socket objects (as
	// `.connection` on Request objects) are re-used by express, and so
	// connection.bytesRead will, at the very start of the request, give us the
	// bytesRead/bytesWritten by the last request to use the same net.Socket object.
	const observeBytesRW = (req: Request): (() => void) => {
		const bytesReadPreviously =
			req.connection._metrics_gatherer!.bytesRead || 0;
		const bytesWrittenPreviously =
			req.connection._metrics_gatherer!.bytesWritten || 0;
		return () => {
			const bytesReadDelta = req.connection.bytesRead - bytesReadPreviously;
			const bytesWrittenDelta =
				req.connection.bytesWritten - bytesWrittenPreviously;
			req.connection._metrics_gatherer!.bytesRead = req.connection.bytesRead;
			req.connection._metrics_gatherer!.bytesWritten =
				req.connection.bytesWritten;
			metrics.histogram(
				'api_bytes_read',
				bytesReadDelta,
				req._metrics_gatherer.labels,
			);
			metrics.histogram(
				'api_bytes_written',
				bytesWrittenDelta,
				req._metrics_gatherer.labels,
			);
		};
	};

	// observe the request latency using process.hrtime
	const observeLatency = (req: Request): (() => void) => {
		const t0 = process.hrtime();
		return () => {
			const t1 = process.hrtime();
			const dt = t1[0] - t0[0] + (t1[1] - t0[1]) / 1e6;
			metrics.histogram(
				'api_latency_milliseconds',
				dt,
				req._metrics_gatherer.labels,
			);
		};
	};

	// attach a middleware to all requests to observe various metrics
	return (req: Request, res: Response, next: NextFunction) => {
		modifyReq(req);
		metrics.counter('api_arrival_total', 1, req._metrics_gatherer.labels);
		const onFinishFuncs = [observeBytesRW(req), observeLatency(req)];
		onFinished(res, () => {
			req._metrics_gatherer.labels.state = req.aborted
				? 'aborted'
				: 'completed';
			req._metrics_gatherer.labels.statusCode = res.statusCode || '';
			onFinishFuncs.forEach(f => f());
		});
		next();
	};
};
