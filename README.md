node-metrics-gatherer
===

gather and expose prometheus metrics with a simple syntax

## Usage:

```
import { metrics } from '@balena/node-metrics-gatherer';

// must describe each metric
metrics.describe('temperature', 'the temperature in the greenhouse, in Celsius');

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

### Gauge

#### Counter

#### Percentile

#### Histogram


