import * as express from 'express';
import { LabelSet, DescriptionMap, CustomParams, CustomParamsMap, MetricsMap, KindMap } from './types';
declare class MetricsGatherer {
    private metrics;
    private customParams;
    private descriptions;
    private kinds;
    constructor(metrics?: MetricsMap, customParams?: CustomParamsMap, descriptions?: DescriptionMap, kinds?: KindMap);
    describe(name: string, text: string, custom?: CustomParams): void;
    gauge(name: string, val: number, labels?: LabelSet): void;
    counter(name: string, val?: number, labels?: LabelSet): void;
    summary(name: string, val: number, labels?: LabelSet): void;
    histogram(name: string, val: number, labels?: LabelSet): void;
    ensureExists(name: string, kind: string, custom?: CustomParams): void;
    reset(name: string): void;
    requestHandler(authTest?: (req: express.Request) => boolean, callback?: Function): express.Handler;
    output(): string;
}
export declare const metrics: MetricsGatherer;
export {};
