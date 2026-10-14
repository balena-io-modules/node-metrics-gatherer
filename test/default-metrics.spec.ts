import { expect } from 'chai';
import 'mocha';

import { metrics } from '../src/index.ts';

describe('collectDefaultMetrics', () => {
	beforeEach(() => {
		metrics.clear();
	});

	// don't leave the default metrics in the output of later tests
	after(() => {
		metrics.clear();
	});

	it('should be safe to call more than once', async () => {
		metrics.collectDefaultMetrics();
		metrics.collectDefaultMetrics();
		expect(metrics.internalErrorCount).to.equal(0);
		expect(await metrics.output()).to.include(
			'# TYPE process_cpu_user_seconds_total counter',
		);
	});

	it('should collect the default metrics again after clear()', async () => {
		metrics.collectDefaultMetrics();
		metrics.clear();
		expect(await metrics.output()).not.to.include(
			'process_cpu_user_seconds_total',
		);
		metrics.collectDefaultMetrics();
		expect(metrics.internalErrorCount).to.equal(0);
		expect(await metrics.output()).to.include(
			'# TYPE process_cpu_user_seconds_total counter',
		);
	});
});
