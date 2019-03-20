"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prometheus = require("prom-client");
const types_1 = require("./types");
class MetricsGatherer {
    constructor(metrics = {
        gauge: {},
        counter: {},
        summary: {},
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
        this.ensureExists(name, 'gauge', {
            labelNames: Object.keys(labels)
        });
        this.metrics.gauge[name].inc(labels, val);
    }
    counter(name, val = 1, labels = {}) {
        this.ensureExists(name, 'counter', {
            labelNames: Object.keys(labels)
        });
        this.metrics.counter[name].inc(labels, val);
    }
    summary(name, val, labels = {}) {
        this.ensureExists(name, 'summary', {
            labelNames: Object.keys(labels)
        });
        this.metrics.summary[name].observe(labels, val);
    }
    histogram(name, val, labels = {}) {
        this.ensureExists(name, 'histogram', {
            labelNames: Object.keys(labels)
        });
        this.metrics.histogram[name].observe(labels, val);
    }
    histogramSummary(name, val, labels = {}) {
        this.histogram(`${name}_hist`, val, labels);
        this.summary(`${name}_summary`, val, labels);
    }
    ensureExists(name, kind, custom = {}) {
        if (!(name in this.descriptions)) {
            this.descriptions[name] = `undescribed ${kind} metric`;
        }
        if (!(name in this.kinds)) {
            const constructors = {
                'gauge': new types_1.MetricConstructor(prometheus.Gauge),
                'counter': new types_1.MetricConstructor(prometheus.Counter),
                'summary': new types_1.MetricConstructor(prometheus.Summary),
                'histogram': new types_1.MetricConstructor(prometheus.Histogram),
            };
            custom = Object.assign(custom, this.customParams[name]);
            this.metrics[kind][name] = constructors[kind].create(Object.assign({ name: name, help: this.descriptions[name] }, custom));
            this.kinds[name] = kind;
        }
        else {
            if (this.kinds[name] != kind) {
                throw new Error(`tried to use ${name} twice - first as ` +
                    `${this.kinds[name]}, then as ${kind}`);
            }
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