import * as express from 'express';
import * as prometheus from 'prom-client';
import { TypedError } from 'typed-error';

import * as Debug from 'debug';
const debug = Debug('node-metrics-gatherer');

import {
	ConstructorMap,
	CustomParams,
	CustomParamsMap,
	DescriptionMap,
	ExistMap,
	KindMap,
	LabelSet,
	MetricConstructor,
	MetricsMap,
} from './types';

type AuthTestFunc = (req: express.Request) => boolean;

export class MetricsGathererError extends TypedError {}

const constructors: ConstructorMap = {
	gauge: new MetricConstructor(prometheus.Gauge),
	counter: new MetricConstructor(prometheus.Counter),
	summary: new MetricConstructor(prometheus.Summary),
	histogram: new MetricConstructor(prometheus.Histogram),
};

export class MetricsGatherer {
	public internalErrorCount: number;
	private metrics: MetricsMap;
	private customParams: CustomParamsMap;
	private descriptions: DescriptionMap;
	private existMap: ExistMap;
	private kinds: KindMap;

	constructor() {
		this.initState();
	}

	private initState() {
		try {
			this.metrics = {
				gauge: {},
				counter: {},
				summary: {},
				histogram: {},
			};
			this.customParams = {};
			this.descriptions = {};
			this.existMap = {};
			this.kinds = {};
			this.internalErrorCount = 0;
		} catch (e) {
			this.err(e);
		}
	}

	// fetch the description for a metric
	public describe(name: string, text: string, custom: CustomParams = {}) {
		try {
			if (this.descriptions[name]) {
				throw new MetricsGathererError(
					`tried to describe metric "${name}" twice`,
				);
			}
			this.descriptions[name] = text;
			this.customParams[name] = custom;
		} catch (e) {
			this.err(e);
		}
	}

	// observe a gauge metric
	public gauge(name: string, val: number, labels: LabelSet = {}) {
		try {
			this.ensureExists(name, 'gauge', labels);
			this.metrics.gauge[name].set(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// increment a counter or gauge
	public inc(name: string, val: number = 1, labels: LabelSet = {}) {
		try {
			// ensure either that this metric already exists, or if not, create a gauge
			this.ensureExists(name, 'gauge', labels);
			if (!this.checkMetricType(name, ['gauge', 'counter'])) {
				throw new MetricsGathererError(
					`Tried to increment non-gauge, non-counter metric ${name}`,
				);
			}
			if (this.kinds[name] === 'gauge') {
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
			this.ensureExists(name, 'gauge', labels);
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
			this.ensureExists(name, 'counter', labels);
			this.metrics.counter[name].inc(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// observe a summary metric
	public summary(name: string, val: number, labels: LabelSet = {}) {
		try {
			this.ensureExists(name, 'summary', labels);
			this.metrics.summary[name].observe(labels, val);
		} catch (e) {
			this.err(e);
		}
	}

	// observe a histogram metric
	public histogram(name: string, val: number, labels: LabelSet = {}) {
		try {
			this.ensureExists(name, 'histogram', labels);
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
			return kinds.includes(this.kinds[name]);
		} catch (e) {
			this.err(e);
		}
	}

	// used declaratively to ensure a given metric of a certain kind exists,
	// given some custom params to instantiate it if absent
	public ensureExists(
		name: string,
		kind: string,
		labels: LabelSet = {},
		custom: CustomParams = {},
	) {
		try {
			// if exists, bail early
			if (this.existMap[name]) {
				return;
			}
			// if already exists with another kind, throw error
			if (this.kinds[name] && this.kinds[name] !== kind) {
				throw new MetricsGathererError(
					`tried to use ${name} twice - first as ` +
						`${this.kinds[name]}, then as ${kind}`,
				);
			}
			// if not described, describe (poorly)
			if (!(name in this.descriptions)) {
				this.descriptions[name] = `undescribed ${kind} metric`;
			}
			// if doesn't exist, create metric
			this.metrics[kind][name] = constructors[kind].create({
				name,
				help: this.descriptions[name],
				labelNames: Object.keys(labels),
				...custom,
				...this.customParams[name],
			});
			this.kinds[name] = kind;
			this.existMap[name] = true;
		} catch (e) {
			this.err(e);
		}
	}

	// reset a given metric by name
	public reset(name: string) {
		try {
			// will only have an entry in this.kinds if the metric has been observed
			// at least once (don't need to "reset" otherwise, and avoids error in
			// indexing)
			if (this.kinds[name]) {
				this.metrics[this.kinds[name]][name].reset();
			}
		} catch (e) {
			this.err(e);
		}
	}

	// create an express request handler given an auth test function
	public requestHandler(authTest?: AuthTestFunc): express.Handler {
		return (req: express.Request, res: express.Response) => {
			if (authTest && !authTest(req)) {
				return res.status(403).send();
			}
			res.writeHead(200, { 'Content-Type': 'text/plain' });
			res.end(prometheus.register.metrics());
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

	// get the prometheus output
	public output(): string {
		try {
			return prometheus.register.metrics();
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

	private err(e: Error) {
		debug(e.stack);
		this.internalErrorCount++;
	}
}
