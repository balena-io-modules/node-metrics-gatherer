// Augment express.js with metrics-specific attributes via declaration merging.
/* tslint:disable-next-line:no-namespace */
declare namespace Express {
	export interface Request {
		aborted?: boolean;
		queueFailState?: 'timed-out' | 'rejected';
		metricsLabels?: LabelSet;
	}
}
