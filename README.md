node-metrics-gatherer
===

gather and expose prometheus metrics with a simple syntax

## Usage:

Basic usage involves adding a single import and a single line. Then, somewhere
else, you can create a request handler to export the metrics.

```
import { metrics } from '@balena/node-metrics-gatherer';

...

// inside some loop which checks sensors...
metrics.gauge('temperature', 28);

...

// create an express request handler to respond to prometheus pulls
app.use('/metrics', metrics.requestHandler());
```

## Metric types

See the [prometheus documentation](https://prometheus.io/docs/concepts/metric_types/)

TODO: explain metric types below (until such time, "percentile" corresponds to
Prometheus's "summary", and the other types correspond directly to the same names
for Prometheus equivalent)

## Labels

Labels can be used to add some more granularity to a metric:

```
metrics.counter('deployments', 1, { method: 'git-push' });
metrics.counter('deployments', 1, { method: 'balena-cli-push' });
```

You must use the full set of labels you intend to attach with each call; 
for example, you can't have one line add the label `method: 'git-push'` and another
line add the label `result: 'success'`. Labels should be used for things which
apply to the metric every time it's invoked (clever use of values like 'unknown'
or 'default' can handle cases where you might think you shouldn't add the label).

**NOTE**: Use labels sparingly - there will be one time-series exported 
for every pair of label names / values which you create

## Descriptions

Metrics can be given a help text using syntax like the following:

```
metrics.describe(
    'api_latency_percentile_all',
    'percentiles of total time taken to service requests to the api including queue wait (all queues and all userAgents together)',
);
```

You can also use `.describe()` for the much-more important task of declaring 
buckets for histogram-type metrics or percentiles for percentile-type metrics
which differ from the defaults:

```
metrics.describe(
    'api_latency_histogram',
    'histogram of total time taken to service requests to the api including queue wait',
    {
        buckets: metricsConfig.serviceTimeBuckets,
        labelNames: ['queue', 'userAgent'],
    },
);
```

### Gauge

TODO

#### Counter

TODO

#### Percentile

TODO

#### Histogram

TODO
