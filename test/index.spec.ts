import { expect } from 'chai';
import 'mocha';

import { metrics } from '../src';

beforeEach(() => {
	metrics.clear();
});

describe('Error', () => {

	it('should fail if same name used for different kinds', () => {
		expect(() => {
			metrics.counter('a_name', 1);
			metrics.histogram('a_name', 1);
		}).to.throw();
	});

});

describe('Gauge', () => {

	it('should create a gauge on inc() for undescribed metric', () => {
		metrics.inc('undescribed_gauge', 10);
		let output = metrics.output();
		expect(/TYPE undescribed_gauge gauge/.test(output)).to.be.true;
	});

	it('should inc and dec by 1 by default', () => {
		let output : string;

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

	it('should throw an error on inc() to histogram, summary', () => {
		expect(() => {
			metrics.histogram('histogram_metric', 1);
			metrics.inc('histogram_metric');
		}).to.throw();
		expect(() => {
			metrics.summary('summary_metric', 1);
			metrics.inc('summary_metric');
		}).to.throw();
	});

	it('should throw an error on dec() to non-gauge', () => {
		expect(() => {
			metrics.histogram('histogram_metric', 1);
			metrics.dec('histogram_metric');
		}).to.throw();
		expect(() => {
			metrics.summary('summary_metric', 1);
			metrics.dec('summary_metric');
		}).to.throw();
		expect(() => {
			metrics.counter('counter_metric', 1);
			metrics.dec('counter_metric');
		}).to.throw();
	});

});

describe('Counter', () => {

	it('should create a counter', () => {
		metrics.describe('existent_counter', 'a counter that should exist');
		metrics.counter('existent_counter');
		let output = metrics.output();
		expect(/TYPE existent_counter counter/.test(output)).to.be.true;
	});

	it('should reset a counter', () => {
		metrics.describe('resetting_counter', 'a counter that should be reset');
		metrics.counter('resetting_counter');
		metrics.reset('resetting_counter');
		let output = metrics.output();
		expect(/resetting_counter 0/.test(output)).to.be.true;
	});

	it('should increment by 1 if not specified', () => {
		metrics.describe('simple_counter', 'a simple counter');
		metrics.counter('simple_counter');
		let output = metrics.output();
		expect(/simple_counter 1/.test(output)).to.be.true;
	});

	it('should increment by a variable amount', () => {
		metrics.describe('variable_counter', 'a counter that should increment by variable amounts');
		metrics.counter('variable_counter', 1);
		metrics.inc('variable_counter', 3);
		let output = metrics.output();
		expect(/variable_counter 4/.test(output)).to.be.true;
	});

});
