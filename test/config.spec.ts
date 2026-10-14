import { expect } from 'chai';
import 'mocha';

import { bytesRWBuckets, latencyBuckets } from '../src/config.ts';

// @prometheus-io/client exports buckets in the order given, so a repeated or
// out-of-order boundary produces inconsistent cumulative counts
const expectStrictlyIncreasing = (buckets: number[]) => {
	for (let i = 1; i < buckets.length; i++) {
		expect(buckets[i]).to.be.greaterThan(buckets[i - 1]);
	}
};

describe('Config', () => {
	describe('latencyBuckets', () => {
		it('should cover 4ms to ~65s in milliseconds', () => {
			expect(latencyBuckets[0]).to.equal(4);
			expect(latencyBuckets.at(-1)).to.equal(65536);
		});

		it('should be strictly increasing', () => {
			expectStrictlyIncreasing(latencyBuckets);
		});
	});

	describe('bytesRWBuckets', () => {
		it('should cover 256 bytes to 4GB', () => {
			expect(bytesRWBuckets[0]).to.equal(256);
			expect(bytesRWBuckets.at(-1)).to.equal(4 * 1024 ** 3);
		});

		it('should be strictly increasing', () => {
			expectStrictlyIncreasing(bytesRWBuckets);
		});
	});
});
