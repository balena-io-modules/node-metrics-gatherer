import * as prometheus from 'prom-client';

import { AggregatorStrategy } from './enums';

export interface LabelSet {
	[name: string]: string;
}

export interface DescriptionMap {
	[name: string]: string;
}

export interface ExistMap {
	[name: string]: boolean;
}

export interface CustomParams {
	percentiles?: number[];
	buckets?: number[];
	labelNames?: string[];
	aggregator?: AggregatorStrategy;
}

export interface CustomParamsMap {
	[name: string]: CustomParams;
}

// weird class to allow polymorphism over constructors yielding type Metric
export class MetricConstructor {
	constructor(public construct: new (...args: any[]) => prometheus.Metric) {}
	public create(...args: any[]): prometheus.Metric {
		return new this.construct(...args);
	}
}

export interface ConstructorMap {
	[kind: string]: MetricConstructor;
}

export interface MetricsMap {
	gauge: { [name: string]: prometheus.Gauge };
	counter: { [name: string]: prometheus.Counter };
	histogram: { [name: string]: prometheus.Histogram };
	summary: { [name: string]: prometheus.Summary };
	[kind: string]: { [name: string]: prometheus.Metric };
}

export interface KindMap {
	[name: string]: string;
}
