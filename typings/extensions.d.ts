/* tslint:disable-next-line:no-namespace */
declare namespace Express {
	export interface Request {
		// missing from type signature exposed by @types/express
		aborted: boolean;
		_metrics_gatherer: {
			labels?: import('./src/types').LabelSet;
		};
	}
}

/* tslint:disable-next-line:no-namespace */
declare module 'net' {
	export interface Socket {
		_metrics_gatherer?: {
			bytesRead?: number;
			bytesWritten?: number;
		};
	}
}
