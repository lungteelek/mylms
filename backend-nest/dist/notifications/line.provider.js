"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LineProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let LineProvider = LineProvider_1 = class LineProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(LineProvider_1.name);
        this.channelAccessToken = this.configService.get('app.lineChannelAccessToken') || '';
    }
    isEnabled() {
        return !!this.channelAccessToken;
    }
    async sendToUser(input) {
        if (!this.isEnabled()) {
            this.logger.warn('LINE Messaging API is not configured; skipping LINE delivery');
            return { delivered: false, skipped: true };
        }
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.channelAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: input.userId,
                messages: [
                    {
                        type: 'text',
                        text: input.text,
                    },
                ],
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`LINE push failed: ${response.status} ${text}`);
        }
        return { delivered: true, skipped: false };
    }
};
exports.LineProvider = LineProvider;
exports.LineProvider = LineProvider = LineProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LineProvider);
