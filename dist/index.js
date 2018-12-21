"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prometheus = require("prom-client");
const defaultPercentiles = [0.5, 0.9, 0.99, 0.999, 1.0];
const defaultBuckets = [4, 16, 50, 100, 250, 500, 1000, 1500, 3000, 8000,
    10000, 20000, 30000];
class MetricConstructor {
    constructor(construct) {
        this.construct = construct;
    }
    create(...args) { return new this.construct(...args); }
}
class MetricsGatherer {
    constructor(metrics = {
        gauge: {},
        counter: {},
        percentile: {},
        histogram: {},
    }, descriptions = {}, kinds = {}) {
        this.metrics = metrics;
        this.descriptions = descriptions;
        this.kinds = kinds;
    }
    describe(name, text) {
        this.descriptions[name] = text;
    }
    gauge(name, val, labels = {}) {
        this.ensureExists(name, 'gauge');
        this.metrics.gauge[name].inc(labels, val);
    }
    counter(name, val = 1, labels = {}) {
        this.ensureExists(name, 'counter');
        this.metrics.counter[name].inc(labels, val);
    }
    percentile(name, val, labels = {}) {
        this.ensureExists(name, 'percentile', { percentiles: defaultPercentiles });
        this.metrics.percentile[name].observe(labels, val);
    }
    customPercentile(name, val, percentiles, labels = {}) {
        this.ensureExists(name, 'percentile', { percentiles });
        this.metrics.percentile[name].observe(labels, val);
    }
    latencyHistogram(name, val, labels = {}) {
        this.ensureExists(name, 'histogram', { buckets: defaultBuckets });
        this.metrics.histogram[name].observe(labels, val);
    }
    customHistogram(name, val, buckets, labels = {}) {
        this.ensureExists(name, 'histogram', { buckets });
        this.metrics.histogram[name].observe(labels, val);
    }
    ensureExists(name, kind, custom) {
        if (!(name in this.descriptions)) {
            throw new Error(`tried to observe a metric ("${name}") with no ` +
                `description. Please use metrics.describe()`);
        }
        if (!(name in this.kinds)) {
            const constructors = {
                'gauge': new MetricConstructor(prometheus.Gauge),
                'counter': new MetricConstructor(prometheus.Counter),
                'percentile': new MetricConstructor(prometheus.Summary),
                'histogram': new MetricConstructor(prometheus.Histogram),
            };
            this.metrics[kind][name] = constructors[kind].create(Object.assign({ name: name, help: this.descriptions[name] }, custom));
            this.kinds[name] = kind;
        }
    }
    reset(name) {
        this.metrics[this.kinds[name]][name].reset();
    }
    requestHandler(authTest) {
        return (req, res) => {
            if (!authTest(req)) {
                res.status(403);
            }
            else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(prometheus.register.metrics());
            }
        };
    }
}
exports.metrics = new MetricsGatherer();
//# sourceMappingURL=index.js.map