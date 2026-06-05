"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('billing', () => ({
    omisePublicKey: process.env.OMISE_PUBLIC_KEY || '',
    omiseSecretKey: process.env.OMISE_SECRET_KEY || '',
}));
