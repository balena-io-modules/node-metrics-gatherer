import type { LabelSet } from '../src/types';

declare global {
	/* tslint:disable-next-line:no-namespace */
	namespace Express {
		export interface Request {
			_metrics_gatherer: {
				labels: LabelSet;
			};
		}
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
