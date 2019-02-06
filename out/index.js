"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prometheus = require("prom-client");
const types_1 = require("./types");
class MetricsGatherer {
    constructor(metrics = {
        gauge: {},
        counter: {},
        percentile: {},
        histogram: {},
    }, customParams = {}, descriptions = {}, kinds = {}) {
        this.metrics = metrics;
        this.customParams = customParams;
        this.descriptions = descriptions;
        this.kinds = kinds;
    }
    describe(name, text, custom = {}) {
        if (this.descriptions[name]) {
            throw new Error(`tried to describe metric "${name}" twice`);
        }
        this.descriptions[name] = text;
        this.customParams[name] = custom;
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
        this.ensureExists(name, 'percentile');
        this.metrics.percentile[name].observe(labels, val);
    }
    histogram(name, val, labels = {}) {
        this.ensureExists(name, 'histogram');
        this.metrics.histogram[name].observe(labels, val);
    }
    ensureExists(name, kind, custom = {}) {
        custom = Object.assign(custom, this.customParams[name]);
        if (!(name in this.descriptions)) {
            throw new Error(`tried to observe a metric ("${name}") with no ` +
                `description. Please use metrics.describe()`);
        }
        if (!(name in this.kinds)) {
            const constructors = {
                'gauge': new types_1.MetricConstructor(prometheus.Gauge),
                'counter': new types_1.MetricConstructor(prometheus.Counter),
                'percentile': new types_1.MetricConstructor(prometheus.Summary),
                'histogram': new types_1.MetricConstructor(prometheus.Histogram),
            };
            this.metrics[kind][name] = constructors[kind].create(Object.assign({ name: name, help: this.descriptions[name] }, custom));
            this.kinds[name] = kind;
        }
    }
    reset(name) {
        if (this.kinds[name]) {
            this.metrics[this.kinds[name]][name].reset();
        }
    }
    requestHandler(authTest, callback) {
        return (req, res) => {
            if (authTest && !authTest(req)) {
                res.status(403).send();
            }
            else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(prometheus.register.metrics());
                if (callback) {
                    callback();
                }
            }
        };
    }
    output() {
        return prometheus.register.metrics();
    }
}
exports.metrics = new MetricsGatherer();
//# sourceMappingURL=index.js.map