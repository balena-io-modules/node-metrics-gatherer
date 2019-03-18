import * as prometheus from 'prom-client';

import { expect } from 'chai';
import 'mocha';

import { metrics } from '../src';

describe('Error', () => {
	it('should fail if same name used for different kinds', () => {
		expect(() => {
			metrics.counter('a_name', 1);
			metrics.histogram('a_name', 1);
		}).to.throw();
	});
});

describe('Counter', () => {

	it('should create a counter', () => {
		metrics.describe({
			name: 'existent_counter', 
			description: 'a counter that should exist'
		});
		metrics.counter('existent_counter');
		let output = prometheus.register.metrics();
		expect(/TYPE existent_counter counter/.test(output)).to.be.true;
	});

	it('should reset a counter', () => {
		metrics.describe({
			name: 'resetting_counter', 
			description: 'a counter that should be reset'
		});
		metrics.counter('resetting_counter');
		metrics.reset('resetting_counter');
		let output = prometheus.register.metrics();
		expect(/resetting_counter 0/.test(output)).to.be.true;
	});

	it('should increment by 1 if not specified', () => {
		metrics.describe({
			name: 'simple_counter', 
			description: 'a simple counter'
		});
		metrics.counter('simple_counter');
		let output = prometheus.register.metrics();
		expect(/simple_counter 1/.test(output)).to.be.true;
	});

	it('should increment by a variable amount', () => {
		metrics.describe({
			name: 'variable_counter', 
			description: 'a counter that should increment by variable amounts'
		});
		metrics.counter('variable_counter', 1337);
		let output = prometheus.register.metrics();
		expect(/variable_counter 1337/.test(output)).to.be.true;
	});

});
