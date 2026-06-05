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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var EmailProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer_1 = __importDefault(require("nodemailer"));
let EmailProvider = EmailProvider_1 = class EmailProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailProvider_1.name);
        const host = this.configService.get('app.smtpHost');
        const port = this.configService.get('app.smtpPort');
        const secure = this.configService.get('app.smtpSecure');
        const user = this.configService.get('app.smtpUser');
        const pass = this.configService.get('app.smtpPass');
        this.fromAddress = this.configService.get('app.smtpFrom') || '';
        this.enabled = !!host && !!port && !!this.fromAddress;
        this.transporter = this.enabled
            ? nodemailer_1.default.createTransport({
                host,
                port,
                secure,
                auth: user && pass ? { user, pass } : undefined,
            })
            : null;
    }
    isEnabled() {
        return this.enabled && !!this.transporter;
    }
    async send(input) {
        if (!this.isEnabled()) {
            this.logger.warn('SMTP is not configured; skipping email delivery');
            return { delivered: false, skipped: true };
        }
        await this.transporter.sendMail({
            from: this.fromAddress,
            to: input.to,
            subject: input.subject,
            text: input.text,
        });
        return { delivered: true, skipped: false };
    }
};
exports.EmailProvider = EmailProvider;
exports.EmailProvider = EmailProvider = EmailProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailProvider);
