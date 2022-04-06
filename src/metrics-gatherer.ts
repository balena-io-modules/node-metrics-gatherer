import * as express from 'express';
import * as prometheus from 'prom-client';
import { TypedError } from 'typed-error';

import * as Debug from 'debug';
const debug = Debug('node-metrics-gatherer');

import { collectAPIMetrics } from './collectors/api/collect';

import {
	AuthTestFunc,
	CustomParams,
	Kind,
	LabelSet,
	MetricConstructor,
	MetricsMap,
	MetricsMetaMap,
} from './types';

export class MetricsGathererError extends TypedError {}

const constructors = {
	gauge: new MetricConstructor(prometheus.Gauge),
	counter: new MetricConstructor(prometheus.Counter),
	summary: new MetricConstructor(prometheus.Summary),
	histogram: new MetricConstructor(prometheus.Histogram),
};

interface Describer {
	[kind: string]: (
		name: string,
		help: string,
		customParams?: CustomParams,
	) => void;
}

export class MetricsGatherer {
	public internalErrorCount: number;
	public meta: MetricsMetaMap;
	private metrics: MetricsMap;
	public describe: Describer;
	public client = prometheus;

	constructor() {
		this.initState();
		this.setupDescribe();
	}

	private initState() {
		try {
			this.metrics = {
				gauge: {},
				counter: {},
				histogram: {},
				summary: {},
			};
			this.meta = {};
			this.internalErrorCount = 0;
		} catch (e) {
			this.err(e);
		}
	}

	private setupDescribe() {
		this.describe = {};
		for (const kind of ['gauge', 'counter', 'histogram', 'summary'] as const) {
			this.describe[kind] = (
				name: string,
				help: string,
				customParams: CustomParams = {},
			) => {
				if (this.meta[name]) {
					throw new MetricsGathererError(
						`tried to describe metric "${name}" twice`,
					);
				} else {
					this.meta[name] = {
						kind,
						help,
						customParams,
					};
				}
			};
		}
	}

	// observe a gauge metric
	public gauge(name: string, val: number, labels: LabelSet = {}) {
		try {
			this.ensureExists('gauge', name, labels);
			this.metrics.gauge[name].set(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// increment a counter or gauge
	public inc(name: string, val: number = 1, labels: LabelSet = {}) {
		try {
			// ensure either that this metric already exists, or if not
			// create either a counter if `_total` suffix is found, or
			// a gauge otherwise
			const kind =
				this.meta[name]?.kind ?? (/.+_total$/.test(name) ? 'counter' : 'gauge');
			this.ensureExists(kind, name, labels);
			if (!this.checkMetricType(name, ['gauge', 'counter'])) {
				throw new MetricsGathererError(
					`Tried to increment non-gauge, non-counter metric ${name}`,
				);
			}
			if (kind === 'gauge') {
				this.metrics.gauge[name].inc(labels, val);
			} else {
				this.metrics.counter[name].inc(labels, val);
			}
		} catch (e) {
			this.err(e);
		}
	}

	// decrement a gauge
	public dec(name: string, val: number = 1, labels: LabelSet = {}) {
		try {
			// ensure either that this metric already exists, or if not, create a gauge
			this.ensureExists('gauge', name, labels);
			if (!this.checkMetricType(name, ['gauge'])) {
				throw new MetricsGathererError(
					`Tried to decrement non-gauge metric ${name}`,
				);
			}
			this.metrics.gauge[name].dec(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// observe a counter metric
	public counter(name: string, val: number = 1, labels: LabelSet = {}) {
		try {
			this.ensureExists('counter', name, labels);
			this.metrics.counter[name].inc(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// observe a summary metric
	public summary(
		name: string,
		val: number,
		labels: LabelSet = {},
		customParams: CustomParams = {},
	) {
		try {
			this.ensureExists('summary', name, labels, customParams);
			this.metrics.summary[name].observe(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// observe a histogram metric
	public histogram(
		name: string,
		val: number,
		labels: LabelSet = {},
		customParams: CustomParams = {},
	) {
		try {
			this.ensureExists('histogram', name, labels, customParams);
			this.metrics.histogram[name].observe(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// observe both a histogram and a summary, adding suffixes to differentiate
	public histogramSummary(name: string, val: number, labels: LabelSet = {}) {
		try {
			this.histogram(`${name}_hist`, val, labels);
			this.summary(`${name}_summary`, val, labels);
		} catch (e) {
			this.err(e);
		}
	}

	// check that a metric is of the given type(s)
	public checkMetricType(name: string, kinds: string[]) {
		try {
			return kinds.includes(this.meta[name].kind);
		} catch (e) {
			this.err(e);
		}
	}

	public getMetric<T extends string = string>(
		name: string,
	): prometheus.Metric<T> | undefined {
		if (this.meta[name]) {
			return this.metrics[this.meta[name].kind][name];
		}
	}

	public exists(name: string): boolean {
		return this.getMetric(name) != null;
	}

	// used declaratively to ensure a given metric of a certain kind exists
	private ensureExists(
		kind: Kind,
		name: string,
		labels: LabelSet = {},
		customParams: CustomParams = {},
	) {
		// if exists, bail early
		if (this.metrics[kind][name] != null) {
			return;
		}
		// if no meta, describe by default to satisfy prometheus
		if (!this.meta[name]) {
			this.describe[kind](name, `undescribed ${kind} metric`, {
				labelNames: Object.keys(labels),
				...customParams,
			});
		} else if (this.meta[name].kind !== kind) {
			// if name already associated with another kind, throw error
			throw new MetricsGathererError(
				`tried to use ${name} twice - first as ` +
					`${this.meta[name].kind}, then as ${kind}`,
			);
		}
		// create prometheus.Metric instance
		this.metrics[kind][name] = constructors[kind].create({
			name,
			help: this.meta[name].help,
			labelNames: Object.keys(labels),
			...customParams,
			...this.meta[name].customParams,
		});
	}

	// reset the metrics or only a given metric if name supplied
	public reset(name?: string) {
		try {
			if (!name) {
				prometheus.register.resetMetrics();
			} else {
				const metric = this.getMetric(name);
				if (metric) {
					metric.reset();
				}
			}
		} catch (e) {
			this.err(e);
		}
	}

	// create an express app listening on a given port, responding with the given
	// requesthandler
	public exportOn(
		port: number,
		path: string = '/metrics',
		requestHandler?: express.Handler,
	) {
		const app = express();
		app.use(path, requestHandler ?? this.requestHandler());
		app.listen(port);
	}

	// create an express request handler given an auth test function
	public requestHandler(authTest?: AuthTestFunc): express.Handler {
		return async (req: express.Request, res: express.Response) => {
			if (authTest && !authTest(req)) {
				return res.status(403).send();
			}
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end(await prometheus.register.metrics());
		};
	}

	// create an express request handler given an auth test function which is
	// suitable for use in a context where we're using node's `cluster` module
	public aggregateRequestHandler(authTest?: AuthTestFunc): express.Handler {
		const aggregatorRegistry = new prometheus.AggregatorRegistry();
		return (req, res) => {
			if (authTest && !authTest(req)) {
				return res.status(403).send();
			}
			aggregatorRegistry
				.clusterMetrics()
				.then((metrics: string) => {
					res.set('Content-Type', aggregatorRegistry.contentType);
					res.send(metrics);
				})
				.catch((err: Error) => {
					this.err(err);
					res.status(500).send();
				});
		};
	}

	// collect default metrics (underlying prom-client)
	public collectDefaultMetrics() {
		prometheus.collectDefaultMetrics();
	}

	// collect generic API metrics given an express app
	public collectAPIMetrics(app: express.Application): express.Application {
		app.use(collectAPIMetrics(this));
		return app;
	}

	// get the prometheus output
	public async output(): Promise<string> {
		try {
			return await prometheus.register.metrics();
		} catch (e) {
			this.err(e);
			return '';
		}
	}

	// clear all metrics
	public clear() {
		try {
			prometheus.register.clear();
			this.initState();
		} catch (e) {
			this.err(e);
		}
	}

	private err(e: unknown) {
		debug(e);
		this.internalErrorCount++;
	}
}
