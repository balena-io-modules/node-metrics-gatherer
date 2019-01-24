import * as prometheus from 'prom-client';
export interface LabelSet {
    [name: string]: string;
}
export interface DescriptionMap {
    [name: string]: string;
}
export interface CustomParams {
    percentiles?: number[];
    buckets?: number[];
    labelNames?: string[];
}
export interface CustomParamsMap {
    [name: string]: CustomParams;
}
export declare class MetricConstructor {
    construct: new (...args: any[]) => prometheus.Metric;
    constructor(construct: new (...args: any[]) => prometheus.Metric);
    create(...args: any[]): prometheus.Metric;
}
export interface ConstructorMap {
    [kind: string]: MetricConstructor;
}
export interface MetricsMap {
    [kind: string]: {
        [name: string]: prometheus.Metric;
    };
}
export interface KindMap {
    [name: string]: string;
}
