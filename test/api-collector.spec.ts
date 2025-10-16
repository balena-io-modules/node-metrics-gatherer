// TODO
import * as chai from 'chai';
import { expect } from 'chai';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import chaiHttp = require('chai-http');
import 'mocha';

import { json } from 'body-parser';
import * as express from 'express';

import { metrics } from '../src';

chai.use(chaiHttp);

describe('API metrics', () => {
	const app = metrics.collectAPIMetrics(express());
	app
		.use(json())
		.post('/echo', (req: express.Request, res: express.Response) => {
			res.send(req.body);
		});
	const server = app.listen(process.env.PORT ?? 3001);

	const requester = chai.request(app).keepOpen();

	beforeEach(() => {
		metrics.reset();
	});

	after(() => {
		metrics.clear();
		server.close();
	});

	it('should report all metrics after 1 request', async () => {
		const res = await requester
			.post('/echo')
			.type('json')
			.send({ hello: 'world' });
		expect(res).to.have.status(200);
		const output = await metrics.output();
		const metricsRegexps = [
			/api_arrival_total{state="completed",statusCode="200"} 1/,
			/api_bytes_read_bucket{le="\+Inf",state="completed",statusCode="200"} 1/,
			/api_bytes_written_bucket{le="\+Inf",state="completed",statusCode="200"} 1/,
			/api_latency_milliseconds_count{state="completed",statusCode="200"} 1/,
		];
		metricsRegexps.forEach((re) => {
			expect(re.test(output)).to.be.true;
		});
	});
});
