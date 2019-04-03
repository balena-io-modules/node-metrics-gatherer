import * as prometheus from 'prom-client';

export interface LabelSet { 
	[name: string]: string
}

export interface DescriptionMap {
	[name: string]: string
}

export interface ExistMap {
	[name: string]: boolean
}

enum AggregatorStrategy {
	SUM = 'sum',
	FIRST = 'first',
	MIN = 'min',
	MAX = 'max',
	AVERAGE = 'average',
	OMIT = 'omit',
}

export interface CustomParams {
	percentiles? : number[]
	buckets? : number[]
	labelNames?: string[]
	aggregator?: AggregatorStrategy
}

export interface CustomParamsMap {
	[name: string]: CustomParams
}

// weird class to allow polymorphism over constructors yielding type Metric
export class MetricConstructor {        
    constructor (public construct: new (...args: any[]) => prometheus.Metric) {
    }
    create (...args: any[]) : prometheus.Metric { return new this.construct(...args); }
}

export interface ConstructorMap {
	[kind: string]: MetricConstructor
}

export interface MetricsMap {
	[kind: string]: { [name: string]: prometheus.Metric }
}

export interface KindMap {
	[name: string]: string
}

