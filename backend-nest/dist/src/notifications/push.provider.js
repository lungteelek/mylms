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
var PushProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushProvider = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const google_auth_library_1 = require("google-auth-library");
let PushProvider = PushProvider_1 = class PushProvider {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(PushProvider_1.name);
        this.projectId = this.configService.get('app.firebaseProjectId') || '';
        this.serviceAccountJson = this.configService.get('app.firebaseServiceAccountJson') || '';
    }
    isEnabled() {
        return !!this.projectId && !!this.serviceAccountJson;
    }
    async sendToDevice(input) {
        if (!this.isEnabled()) {
            this.logger.warn('Firebase is not configured; skipping push delivery');
            return { delivered: false, skipped: true };
        }
        const credentials = JSON.parse(this.serviceAccountJson);
        const auth = new google_auth_library_1.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
        });
        const client = await auth.getClient();
        const accessTokenResponse = await client.getAccessToken();
        const accessToken = typeof accessTokenResponse === 'string' ? accessTokenResponse : accessTokenResponse.token;
        if (!accessToken) {
            throw new Error('Unable to obtain Firebase access token');
        }
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: {
                    token: input.token,
                    notification: {
                        title: input.title,
                        body: input.body,
                    },
                    data: input.data,
                },
            }),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`FCM send failed: ${response.status} ${text}`);
        }
        return { delivered: true, skipped: false };
    }
};
exports.PushProvider = PushProvider;
exports.PushProvider = PushProvider = PushProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PushProvider);
