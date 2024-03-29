import type * as express from 'express';
import type * as prometheus from 'prom-client';

import type { AggregatorStrategy } from './enums';

export interface LabelSet {
	[name: string]: string;
}

export interface CustomParams {
	percentiles?: number[];
	buckets?: number[];
	labelNames?: string[];
	aggregator?: AggregatorStrategy;
}
// weird class to allow polymorphism over constructors yielding type Metric
export class MetricConstructor<
	T extends string = string,
	U extends any[] = any[],
> {
	constructor(public construct: new (...args: U) => prometheus.Metric<T>) {}
	public create(...args: U): prometheus.Metric<T> {
		return new this.construct(...args);
	}
}

export interface MetricsMap<T extends string = string> {
	gauge: { [name: string]: prometheus.Gauge<T> };
	counter: { [name: string]: prometheus.Counter<T> };
	histogram: { [name: string]: prometheus.Histogram<T> };
	summary: { [name: string]: prometheus.Summary<T> };
}

export type Kind = keyof MetricsMap;

export interface MetricsMeta {
	kind: Kind;
	help: string;
	customParams: CustomParams;
}

export interface MetricsMetaMap {
	[name: string]: MetricsMeta;
}

export type AuthTestFunc = (req: express.Request) => boolean;
