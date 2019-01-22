"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class MetricConstructor {
    constructor(construct) {
        this.construct = construct;
    }
    create(...args) { return new this.construct(...args); }
}
exports.MetricConstructor = MetricConstructor;
//# sourceMappingURL=types.js.map