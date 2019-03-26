node-metrics-gatherer
===

gather and expose prometheus metrics with a simple syntax

## Usage:

### Writing metrics
Basic usage involves adding a single import and a single line. 

```
import { metrics } from '@balena/node-metrics-gatherer';

...

// inside some loop which checks sensors...
metrics.gauge('temperature', 28);
```

### Exporting metrics

Then, somewhere else, you can create a request handler to export the metrics:

```
// create an express request handler to respond to prometheus pulls
app.use('/metrics', metrics.requestHandler());
```

Optionally, you can provide a function which validates whether the requeest should
be served or given a 403, by returning a boolean:

```
app.use('/metrics', metrics.requestHandler((req) => req.get('Authorization') === 'Basic 123456'));
```

## Node's `cluster` module

If an application forks several child workers and they each listen on `:80/metrics`, 
they will write their own metrics each time, causing instability and confusion. Thankfully,
[`prom-client`](https://github.com/siimon/prom-client/) provides a way to handle this, with a registry you create just after you fork. Internally, it handles message-passing between the 
workers and the main process, where the metrics are aggregated. The `examples/` folder in that repo has (as of this writing) an example.

See below the function included here to wrap that AggregatorRegistry class:

```
// create an express request handler to respond to prometheus pulls at the level 
// of the entrypoint script of an app which uses the `cluster` module to fork workers

if (cluster.isMaster) {
	for (let i = 0; i < 4; i++) {
		cluster.fork();
	}
	const aggregateMetricsServer = express();
	aggregateMetricsServer.get('/cluster_metrics', metrics.aggregateRequestHandler());
	aggregateMetricsServer.listen(3001);
	console.log('Cluster metrics server listening on 3001, metrics exposed on /cluster_metrics');
}
```

## Metric types

See the [prometheus documentation](https://prometheus.io/docs/concepts/metric_types/)

The metric types available as method calls (eg., `metrics.summary`) correspond 
to the Prometheus metric types (eg., Prometheus's "Summary")


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

**NOTE**: Use labels sparingly - there will be one time-series created
for every pair of label names / values which you create. It would be bad to create
a label to track source IP, for example, unless you were really sure that the tsdb could
handle it.

## Descriptions

Metrics can be given a help text using syntax like the following:

```
metrics.describe(
    'api_request_duration_milliseconds',
    'histogram of total time taken to service requests to the api including queue wait (all queues and all userAgents together)',
);
```

This is where labels would be specified as well:

```
metrics.describe(
    'api_request_duration_milliseconds',
    'histogram of total time taken to service requests to the api including queue wait (all queues and all userAgents together)',
    {
        labelNames: ['requestType']
    },
);
```

You can also use `.describe()` to declare buckets for histogram-type metrics or 
percentiles for summary-type metrics, if you'd like them to differ from the defaults:


**histogram buckets**
```
metrics.describe(
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
metrics.describe(
    'api_request_duration_milliseconds',
    'summary of total time taken to service requests to the api including queue wait',
    {
        percentiles: [0.9, 0.99, 0.999, 0.9999, 0.99999],
        labelNames: ['queue', 'userAgent'],
    },
);
```
 


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
