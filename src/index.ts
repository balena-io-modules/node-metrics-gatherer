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
			summary: {},
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
		this.ensureExists(name, 'gauge', {
			labelNames: Object.keys(labels)
		});
		(<prometheus.Gauge>this.metrics.gauge[name]).inc(labels, val);
	}

	// observe a counter metric
	counter(name : string, 
		val : number = 1, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'counter', {
			labelNames: Object.keys(labels)
		});
		(<prometheus.Counter>this.metrics.counter[name]).inc(labels, val);
	}

	// observe a summary metric
	summary(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'summary', {
			labelNames: Object.keys(labels)
		});
		(<prometheus.Summary>this.metrics.summary[name]).observe(labels, val);
	}

	// observe a histogram metric
	histogram(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'histogram', {
			labelNames: Object.keys(labels)
		});
		(<prometheus.Histogram>this.metrics.histogram[name]).observe(labels, val);
	}

	// used declaratively to ensure a given metric of a certain kind exists, 
	// given some custom params to instantiate it if absent
	ensureExists(name : string, kind : string, custom : CustomParams = {}) {
		// create description if it doesn't exist
		if (!(name in this.descriptions)) {
			this.descriptions[name] = `undescribed ${kind} metric`;
		}
		if (!(name in this.kinds)) {
			const constructors : ConstructorMap = {
				'gauge': new MetricConstructor(prometheus.Gauge),
				'counter': new MetricConstructor(prometheus.Counter),
				'summary': new MetricConstructor(prometheus.Summary),
				'histogram': new MetricConstructor(prometheus.Histogram),
			};
			// mix provided custom params with custom params given by 
			// `describe()`
			custom = Object.assign(custom, this.customParams[name]);
			this.metrics[kind][name] = constructors[kind].create({
				name: name,
				help: this.descriptions[name],
				...custom
			});
			this.kinds[name] = kind;
		} else {
			if (this.kinds[name] != kind) {
				throw new Error(`tried to use ${name} twice - first as ` +
					`${this.kinds[name]}, then as ${kind}`);
			}
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
