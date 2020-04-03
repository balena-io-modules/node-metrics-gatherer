import { expect } from 'chai';
import 'mocha';

import { metrics } from '../src';

beforeEach(() => {
	metrics.clear();
});

const expectToErr = (f: () => void) => {
	const errsBefore = metrics.internalErrorCount;
	f();
	expect(metrics.internalErrorCount - errsBefore).to.equal(1);
};

describe('Error', () => {
	it('should fail if same name used for different kinds', () => {
		expectToErr(() => {
			metrics.counter('a_name', 1);
			metrics.histogram('a_name', 1);
		});
	});
});

describe('Gauge', () => {
	it('should create a gauge on inc() for undescribed metric', () => {
		metrics.inc('undescribed_gauge', 10);
		const output = metrics.output();
		expect(/TYPE undescribed_gauge gauge/.test(output)).to.be.true;
	});

	it('should inc and dec by 1 by default', () => {
		let output: string;

		metrics.inc('undescribed_gauge');
		output = metrics.output();
		expect(/undescribed_gauge 1/.test(output)).to.be.true;

		metrics.inc('undescribed_gauge');
		output = metrics.output();
		expect(/undescribed_gauge 2/.test(output)).to.be.true;

		metrics.dec('undescribed_gauge');
		output = metrics.output();
		expect(/undescribed_gauge 1/.test(output)).to.be.true;
	});

	it('should track runtime of functions properly', () => {
		let output: string;

		const func = async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
		};
		metrics.run('func_running_gauge', func);
		output = metrics.output();
		expect(/func_running_gauge 1/.test(output)).to.be.true;
		setTimeout(() => {
			output = metrics.output();
			expect(/func_running_gauge 0/.test(output)).to.be.true;
		}, 200);
	});

	it('should track runtime of promises properly', () => {
		let output: string;

		const promise = new Promise(resolve => setTimeout(resolve, 100));
		metrics.resolve('promise_running_gauge', promise);
		output = metrics.output();
		expect(/promise_running_gauge 1/.test(output)).to.be.true;
		setTimeout(() => {
			output = metrics.output();
			expect(/promise_running_gauge 0/.test(output)).to.be.true;
		}, 200);
	});
});

describe('Counter', () => {
	it('should create a counter', () => {
		metrics.describe.counter('existent_counter', 'a counter that should exist');
		metrics.counter('existent_counter');
		const output = metrics.output();
		expect(/TYPE existent_counter counter/.test(output)).to.be.true;
	});

	it('should reset a counter', () => {
		metrics.describe.counter(
			'resetting_counter',
			'a counter that should be reset',
		);
		metrics.counter('resetting_counter');
		metrics.reset('resetting_counter');
		const output = metrics.output();
		expect(/resetting_counter 0/.test(output)).to.be.true;
	});

	it('should increment by 1 if not specified', () => {
		metrics.describe.counter('simple_counter', 'a simple counter');
		metrics.counter('simple_counter');
		const output = metrics.output();
		expect(/simple_counter 1/.test(output)).to.be.true;
	});

	it('should increment by a variable amount', () => {
		metrics.describe.counter(
			'variable_counter',
			'a counter that should increment by variable amounts',
		);
		metrics.counter('variable_counter', 1);
		metrics.inc('variable_counter', 3);
		const output = metrics.output();
		expect(/variable_counter 4/.test(output)).to.be.true;
	});

	it('should throw an error on dec() to counter', () => {
		expectToErr(() => {
			metrics.counter('counter_metric', 1);
			metrics.dec('counter_metric');
		});
	});
});

describe('Summary', () => {
	it('should throw an error on inc() to summary', () => {
		expectToErr(() => {
			metrics.summary('summary_metric', 1);
			metrics.inc('summary_metric');
		});
	});

	it('should throw an error on dec() to summary', () => {
		expectToErr(() => {
			metrics.summary('summary_metric', 1);
			metrics.dec('summary_metric');
		});
	});

	it('should allow single-line CustomParams', () => {
		const percentiles = [0.1, 0.5, 0.9];
		metrics.summary('summary_metric', 1, {}, { percentiles });
		expect(metrics.meta['summary_metric'].customParams.percentiles).to.eql(
			percentiles,
		);
	});
});

describe('Histogram', () => {
	it('should throw an error on inc() to histogram', () => {
		expectToErr(() => {
			metrics.histogram('histogram_metric', 1);
			metrics.inc('histogram_metric');
		});
	});

	it('should throw an error on dec() to histogram', () => {
		expectToErr(() => {
			metrics.histogram('histogram_metric', 1);
			metrics.dec('histogram_metric');
		});
	});

	it('should allow single-line CustomParams', () => {
		const buckets = [1, 9, 99, 999];
		metrics.histogram('histogram_metric', 1, {}, { buckets });
		expect(metrics.meta['histogram_metric'].customParams.buckets).to.eql(
			buckets,
		);
	});
});
