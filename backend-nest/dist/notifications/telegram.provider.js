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
var TelegramProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let TelegramProvider = TelegramProvider_1 = class TelegramProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(TelegramProvider_1.name);
        this.botToken = this.configService.get('app.telegramBotToken') || '';
    }
    isEnabled() {
        return !!this.botToken;
    }
    async sendMessage(input) {
        if (!this.isEnabled()) {
            this.logger.warn('Telegram Bot API is not configured; skipping Telegram delivery');
            return { delivered: false, skipped: true };
        }
        const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: input.chatId,
                text: input.text,
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Telegram send failed: ${response.status} ${text}`);
        }
        return { delivered: true, skipped: false };
    }
};
exports.TelegramProvider = TelegramProvider;
exports.TelegramProvider = TelegramProvider = TelegramProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TelegramProvider);
