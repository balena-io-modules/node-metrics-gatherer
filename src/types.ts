import type express from 'express';
import type prometheus from 'prom-client';

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
