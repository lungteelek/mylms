"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('queue', () => ({
    driver: process.env.QUEUE_DRIVER || 'inline',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
}));
