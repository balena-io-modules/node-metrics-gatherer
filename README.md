node-metrics-gatherer
===

gather and expose prometheus metrics with a simple syntax

## Diagram

[![diagram of module](https://docs.google.com/drawings/d/e/2PACX-1vQV0WH1tpJJR_nm1FkIEUMwX2-0QNUZY-j9ArDtJ3MUyrDGnzvWm-e8J6CNmpD72V5uzttocdNUcRBD/pub?w=984&amp;h=407)](https://docs.google.com/drawings/d/1BvUjCTtYJNlS9GIFXnfMcNjkt2m1Le_j80btPTLiarE/edit?usp=sharing)


## Basic Usage:

### Writing metrics
Basic usage involves adding a single import and a single line.

```
import { metrics } from '@balena/node-metrics-gatherer';

...

// inside some loop which checks sensors...
metrics.gauge('temperature', 28);
```

### Exporting metrics (simple)

Then, you need to make sure the metrics can be served when a request arrives, either on an existing express app, or creating a dedicated express app listening on a given port:

```
// create a request handler to respond to prometheus pulls, given an
// already-existing express app
app.use('/metrics', metrics.requestHandler());

// OR, create our own app (using port 9337, arbitrarily)
metrics.exportOn(9337, '/metrics');
```

Optionally, you can provide a function which validates whether the requeest should
be served or given a 403, by returning a boolean (an "authFunc"):

```
const authFunc = (req) => req.get('Authorization') === 'Basic 123456');
app.use('/metrics', metrics.requestHandler(authFunc));

// OR, if creating our own app (using port 9337, arbitrarily)
metrics.exportOn(9337, '/metrics', metrics.requestHandler(authFunc));
```

## Exporting metrics (cluster)

If an application forks several child workers and they each listen on `:80/metrics`, each worker will have a random chance of being hit, only exporting their own metrics each time, causing instability and confusion. Thankfully, [`prom-client`](https://github.com/siimon/prom-client/) provides a way to handle this, with a registry you create just after you fork. Internally, it handles message-passing between the workers and the main process, where the metrics are aggregated. The `examples/` folder in that repo has (as of this writing) an example. This requires a separate express app to be created, listening on a port which isn't participating in the worker cluster pooling.

See below an example usage:

(port 9337 chosen arbitrarily)

```
if (cluster.isMaster) {
	for (let i = 0; i < 4; i++) {
		cluster.fork();
	}
	metrics.listenAndExport(9337, '/cluster_metrics', metrics.aggregateRequestHandler());
}
```

### A warning about `metrics.describe` and Node's `cluster` module

When you make a call to `metrics.describe.counter()` (or `metrics.describe.histogram()`, etc.)
, a global registry object is updated with the metric's description. If you call 
`metrics.describe.counter()` in the master before forking, the
registries inside the workers will not have the metric definition, and because you can write
to a metric without first describing it, this means it will simply have all defaults, and not
your custom description, labels, buckets, percentiles, etc...

To avoid this, metrics should be described *inside the code path that the workers will follow*,
so that the global registry objects in the workers will have the metric descriptions.

## Metric types

See the [prometheus documentation](https://prometheus.io/docs/concepts/metric_types/)

The metric types available as method calls (eg., `metrics.summary`) correspond
to the Prometheus metric types (eg., Prometheus's "Summary")

### Gauge

Used to record a value which can vary over time, like temperature.

```
metrics.gauge('greenhouse_temperature', temp [, labelObject ]);
```

#### Counter

Used to record increases to a monotonic counter, like requests served.

```
metrics.counter('requests_served_total', 1 [, labelObject ]);
```

#### Summary

Used to calculate (pre-defined) quantiles on a stream of data.

```
metrics.summary('db_query_duration_milliseconds', queryTime, [, labelObject ]);
```

#### Histogram

Used to calculate a histogram on a stream of data.

```
metrics.histogram('db_query_duration_milliseconds', queryTime, [, labelObject ]);
```

#### HistogramSummary

There's a convenience method to observe both a histogram and a summary, which will
suffix `_hist` and `_summary` to the metrics.

```
metrics.histogramSummary('db_query_duration_milliseconds', queryTime, [, labelObject ]);
```

## Labels

Labels can be used to add some more granularity to a metric:

```
metrics.counter('application_deployments_total', 1, { app: userRequest.appId, method: 'git-push' });
metrics.counter('application_deployments_total', 1, { app: userRequest.appId, method: 'balena-cli-push' });
```

You must use the full set of labels you intend to attach with each call;
for example, you can't have one line add the labels `{ method: 'git-push' }` and another
line add the label `{ result: 'success' }`. Labels should be used for things which
apply to the metric every time it's invoked (clever use of values like 'unknown'
or 'default' can handle cases where you might think you shouldn't add the label).

### Labels and time-series cardinality

Use labels sparingly - there will be one time-series created for every pair of label names
/ values which you create. It would be bad to create a label to track source IP, for example,
unless you were really sure that the tsdb could handle it.

As an example, let's say we have two labels, `A` and `B`, and they can have values
`[x, y]`, and `[q, r, s]`, respectively. Then there would be the following time series:

```
A=x, B=q
A=x, B=r
A=x, B=s
A=y, B=q
A=y, B=r
A=y, B=s
```

## Descriptions

Descriptions can be used to inform prometheus / the client library about the metric:

### Help text

Metrics description calls specify the type of the metric, its name, and a description, at minimum:

```
metrics.describe.histogram(
    'api_request_duration_milliseconds',
    'histogram of total time taken to service requests to the api including queue wait (all queues and all userAgents together)',
);
```

### Defining the label-set

This is where labels would be specified as well:

```
metrics.describe.histogram(
    'api_request_duration_milliseconds',
    'histogram of total time taken to service requests to the api including queue wait (all queues and all userAgents together)',
    {
        labelNames: ['requestType']
    },
);
```

### Histogram buckets and Summary percentiles

You can also declare buckets for histogram-type metrics or percentiles for summary-type metrics, if you'd like them to differ from the defaults:

**histogram buckets**
```
metrics.describe.histogram(
    'api_request_duration_milliseconds',
    'histogram of total time taken to service requests to the api including queue wait',
    {
        buckets: [4, 10, 100, 500, 1000, 5000, 15000, 30000],
        labelNames: ['queue', 'userAgent'],
    },
);
```

**summary percentiles**
```
metrics.describe.summary(
    'api_request_duration_milliseconds',
    'summary of total time taken to service requests to the api including queue wait',
    {
        percentiles: [0.9, 0.99, 0.999, 0.9999, 0.99999],
        labelNames: ['queue', 'userAgent'],
    },
);
```

### Clustered aggregation strategy

There are several aggregation strategies which `prom-client`'s `AggregatorRegistry`
can use to combine the metrics recorded by `cluster` workers. They are:

- sum
- first
- min
- max
- average
- omit

(You can see how they work in the source of [`prom-client/lib/metricAggregators.js`](https://github.com/siimon/prom-client/blob/master/lib/metricAggregators.js))

In order to control the aggregation strategy (which defaults to 'sum' if unspecified)
for a given metric, you can supply an `aggregator` property to `describe()` which
will determine the method used by the aggregator registry when multiple clustered
workers write to that metric.

Let's say we forked 4 workers, each of which observed a given number of connections
being active at a time, writing to a Gauge-type metric:

```
on('connect', () => {
    nConnections++;
    metrics.gauge('active_connections', nConnections);
});
on('disconnect', () => {
    nConnections--;
    metrics.gauge('active_connections', nConnections);
});
```

We would probably be content with the default aggregation behaviour (which is to
sum the individual results from each worker) to find out the total number of 
active connections.

However, if we wanted to also know the number of connections which the
most-busy worker was handling, to get a measure of how far the busiest worker
deviated from the average (which would be `total / nWorkers`), we could also
record a gauge which had been described with the `max` aggregation strategy:

```
metrics.describe.gauge(
    'active_connections_max',
    'the number of connections being handled by the busiest worker',
    {
        aggregator: 'max'
    }
);

...

on('connect', () => {
    nConnections++;
    metrics.gauge('active_connections', nConnections);
    metrics.gauge('active_connections_max', nConnections);
});
on('disconnect', () => {
    nConnections--;
    metrics.gauge('active_connections', nConnections);
    metrics.gauge('active_connections_max', nConnections);
});
```

### Internal errors

Errors occuring in calls to this library are caught, logged to stderr if the `DEBUG` env var is defined, and a public property of the MetricsGatherer object will be incremented: `internalErrorCount`.
