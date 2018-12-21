import * as prometheus from 'prom-client';
import * as express from 'express';

const defaultPercentiles = [0.5, 0.9, 0.99, 0.999, 1.0];
const defaultBuckets = [4, 16, 50, 100, 250, 500, 1000, 1500, 3000, 8000, 
	10000, 20000, 30000];

interface LabelSet { 
	[name: string]: string
}

interface DescriptionMap {
	[name: string]: string
}

interface CustomParams {
	percentiles? : number[]
	buckets? : number[]
}

// weird class to allow polymorphism over constructors yielding type Metric
class MetricConstructor {        
    constructor (public construct: new (...args: any[]) => prometheus.Metric) {
    }
    create (...args: any[]) : prometheus.Metric { return new this.construct(...args); }
}

interface ConstructorMap {
	[kind: string]: MetricConstructor
}

interface MetricsMap {
	[kind: string]: { [name: string]: prometheus.Metric }
}

interface KindMap {
	[name: string]: string
}

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

	describe(name : string, text : string) {
		this.descriptions[name] = text;
	}

	gauge(name : string, 
		val : number,
		labels : LabelSet = {}) {
		this.ensureExists(name, 'gauge');
		(<prometheus.Gauge>this.metrics.gauge[name]).inc(labels, val);
	}

	counter(name : string, 
		val : number = 1, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'counter');
		(<prometheus.Counter>this.metrics.counter[name]).inc(labels, val);
	}

	percentile(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'percentile', { percentiles: defaultPercentiles });
		(<prometheus.Summary>this.metrics.percentile[name]).observe(labels, val);
	}

	customPercentile(name : string, 
		val : number, 
		percentiles : number[],
		labels : LabelSet = {}) {
		this.ensureExists(name, 'percentile', { percentiles });
		(<prometheus.Summary>this.metrics.percentile[name]).observe(labels, val);
	}

	latencyHistogram(name : string, 
		val : number, 
		labels : LabelSet = {}) {
		this.ensureExists(name, 'histogram', { buckets: defaultBuckets });
		(<prometheus.Histogram>this.metrics.histogram[name]).observe(labels, val);
	}

	customHistogram(name : string, 
		val : number, 
		buckets : number[],
		labels : LabelSet = {}) {
		this.ensureExists(name, 'histogram', { buckets });
		(<prometheus.Histogram>this.metrics.histogram[name]).observe(labels, val);
	}

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

	reset(name: string) {
		this.metrics[this.kinds[name]][name].reset();
	}

	requestHandler(authTest : (req: express.Request) => boolean) : express.Handler {
		return (req : express.Request, res : express.Response) => {
			if (!authTest(req)) {
				res.status(403);
			} else {
				res.writeHead(200, { 'Content-Type': 'text/plain' });
				res.end(prometheus.register.metrics());
			}
		};
	}

}

export const metrics = new MetricsGatherer();
