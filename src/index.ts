import * as prometheus from 'prom-client';
import * as express from 'express';

import { 
	LabelSet,
	DescriptionMap,
	CustomParams,
	CustomParamsMap,
	MetricConstructor,
	ConstructorMap,
	MetricsMap,
	KindMap
} from './types';

class MetricsGatherer {

	constructor(
		private metrics: MetricsMap = {
			gauge: {},
			counter: {},
			percentile: {},
			histogram: {},
		},
		private customParams: CustomParamsMap = {},
		private descriptions: DescriptionMap = {},
		private kinds: KindMap = {},
	) {}

	// fetch the description for a metric
	describe(name : string, text : string, custom : CustomParams = {}) {
		if (this.descriptions[name]) {
			throw new Error(`tried to describe metric "${name}" twice`);
		}
		this.descriptions[name] = text;
		this.customParams[name] = custom;
	}

	// observe a gauge metric
	gauge(name : string, 
		val : number,
		labels : LabelSet = {}) {
		this.ensureExists(name, 'gauge');
		(<prometheus.Gauge>this.metrics.gauge[name]).inc(labels, val);
	}

	// observe a counter metric
	counter(name : string, 
		val : number = 1, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'counter');
		(<prometheus.Counter>this.metrics.counter[name]).inc(labels, val);
	}

	// observe a percentile metric
	percentile(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'percentile');
		(<prometheus.Summary>this.metrics.percentile[name]).observe(labels, val);
	}

	// observe a histogram metric
	histogram(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'histogram');
		(<prometheus.Histogram>this.metrics.histogram[name]).observe(labels, val);
	}

	// used declaratively to ensure a given metric of a certain kind exists, 
	// given some custom params to instantiate it if absent
	ensureExists(name : string, kind : string, custom : CustomParams = {}) {
		custom = Object.assign(custom, this.customParams[name]);
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
		// will only have an entry in this.kinds if the metric has been observed 
		// at least once (don't need to "reset" otherwise, and avoids error in
		// indexing)
		if (this.kinds[name]) {
			this.metrics[this.kinds[name]][name].reset();
		}
	}

	// create an express request handler given an auth test function
	requestHandler(authTest? : (req: express.Request) => boolean, callback? : Function) : express.Handler {
		return (req : express.Request, res : express.Response) => {
			if (authTest && !authTest(req)) {
				res.status(403).send();
			} else {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end(prometheus.register.metrics());
				if (callback) {
					callback();
				}
			}
		};
	}

	// get the prometheus output
	output() : string {
		return prometheus.register.metrics();
	}

}

export const metrics = new MetricsGatherer();
