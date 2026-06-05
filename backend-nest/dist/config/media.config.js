"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('media', () => ({
    muxTokenId: process.env.MUX_TOKEN_ID || '',
    muxTokenSecret: process.env.MUX_TOKEN_SECRET || '',
}));
