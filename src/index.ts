import * as prometheus from 'prom-client';
import * as express from 'express';

import { 
	LabelSet,
	DescriptionMap,
	CustomParams,
	MetricConstructor,
	ConstructorMap,
	MetricsMap,
	KindMap
} from './types';

import {
	defaultPercentiles,
	defaultBuckets
} from './constants';

class MetricsGatherer {

	constructor(
		private metrics: MetricsMap = {
			gauge: {},
			counter: {},
			percentile: {},
			histogram: {},
		},
		private descriptions: DescriptionMap = {},
		private kinds: KindMap = {},
	) {}

	// fetch the description for a metric
	describe(name : string, text : string) {
		this.descriptions[name] = text;
	}

	// create a gauge metric
	gauge(name : string, 
		val : number,
		labels : LabelSet = {}) {
		this.ensureExists(name, 'gauge');
		(<prometheus.Gauge>this.metrics.gauge[name]).inc(labels, val);
	}

	// create a counter metric
	counter(name : string, 
		val : number = 1, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'counter');
		(<prometheus.Counter>this.metrics.counter[name]).inc(labels, val);
	}

	// create a percentile metric
	percentile(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'percentile', { percentiles: defaultPercentiles });
		(<prometheus.Summary>this.metrics.percentile[name]).observe(labels, val);
	}

	// createa a custom percentile metric
	customPercentile(name : string, 
		val : number, 
		percentiles : number[],
		labels : LabelSet = {}) {
		this.ensureExists(name, 'percentile', { percentiles });
		(<prometheus.Summary>this.metrics.percentile[name]).observe(labels, val);
	}

	// create a latency histogram metric
	latencyHistogram(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'histogram', { buckets: defaultBuckets });
		(<prometheus.Histogram>this.metrics.histogram[name]).observe(labels, val);
	}

	// create a custom histogram metric
	customHistogram(name : string, 
		val : number, 
		buckets : number[],
		labels : LabelSet = {}) {
		this.ensureExists(name, 'histogram', { buckets });
		(<prometheus.Histogram>this.metrics.histogram[name]).observe(labels, val);
	}

	// used declaratively to ensure a given metric of a certain kind exists, 
	// given some custom params to instantiate it if absent
	ensureExists(name : string, kind : string, custom? : CustomParams) {
		if (!(name in this.descriptions)) {
			throw new Error(`tried to observe a metric ("${name}") with no ` +
				`description. Please use metrics.describe()`);
		}
		if (!(name in this.kinds)) {
			const constructors : ConstructorMap = {
				'gauge': new MetricConstructor(prometheus.Gauge),
				'counter': new MetricConstructor(prometheus.Counter),
				'percentile': new MetricConstructor(prometheus.Summary),
				'histogram': new MetricConstructor(prometheus.Histogram),
			};
			this.metrics[kind][name] = constructors[kind].create({
				name: name,
				help: this.descriptions[name],
				...custom
			});
			this.kinds[name] = kind;
		}
	}

	// reset a given metric by name
	reset(name: string) {
		this.metrics[this.kinds[name]][name].reset();
	}

	// create an express request handler given an auth test function
	requestHandler(authTest? : (req: express.Request) => boolean) : express.Handler {
		return (req : express.Request, res : express.Response) => {
			if (authTest && !authTest(req)) {
				res.status(403);
			} else {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end(prometheus.register.metrics());
			}
		};
	}

	// get the prometheus output
	output() : string {
		return prometheus.register.metrics();
	}

}

export const metrics = new MetricsGatherer();
