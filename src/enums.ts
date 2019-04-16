// see: https://github.com/siimon/prom-client#usage-with-nodejss-cluster-module
export enum AggregatorStrategy {
	SUM = 'sum',
	FIRST = 'first',
	MIN = 'min',
	MAX = 'max',
	AVERAGE = 'average',
	OMIT = 'omit',
}
