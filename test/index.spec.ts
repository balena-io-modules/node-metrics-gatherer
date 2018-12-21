import * as prometheus from 'prom-client';

import { expect } from 'chai';
import 'mocha';

import { metrics } from '../src';

describe('Error', () => {
	it('should fail if no decsription given', () => {
		expect(() => {
			metrics.counter('metric_that_does_not_have_description');
		}).to.throw();
	});
});

describe('Counter', () => {

	it('should create a counter', () => {
		metrics.describe('existent_counter', 'a counter that should exist');
		metrics.counter('existent_counter');
		let output = prometheus.register.metrics();
		expect(/TYPE existent_counter counter/.test(output)).to.be.true;
	});

	it('should reset a counter', () => {
		metrics.describe('resetting_counter', 'a counter that should be reset');
		metrics.counter('resetting_counter');
		metrics.reset('resetting_counter');
		let output = prometheus.register.metrics();
		expect(/resetting_counter 0/.test(output)).to.be.true;
	});

	it('should increment by 1 if not specified', () => {
		metrics.describe('simple_counter', 'a simple counter');
		metrics.counter('simple_counter');
		let output = prometheus.register.metrics();
		expect(/simple_counter 1/.test(output)).to.be.true;
	});

	it('should increment by a variable amount', () => {
		metrics.describe('variable_counter', 'a counter that should increment by variable amounts');
		metrics.counter('variable_counter', 1337);
		let output = prometheus.register.metrics();
		expect(/variable_counter 1337/.test(output)).to.be.true;
	});

});
