"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const notifications_controller_1 = require("./notifications.controller");
const email_provider_1 = require("./email.provider");
const line_provider_1 = require("./line.provider");
const notifications_repository_1 = require("./notifications.repository");
const notifications_service_1 = require("./notifications.service");
const push_provider_1 = require("./push.provider");
const telegram_provider_1 = require("./telegram.provider");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        controllers: [notifications_controller_1.NotificationsController],
        providers: [
            notifications_repository_1.NotificationsRepository,
            notifications_service_1.NotificationsService,
            email_provider_1.EmailProvider,
            push_provider_1.PushProvider,
            line_provider_1.LineProvider,
            telegram_provider_1.TelegramProvider,
        ],
        exports: [
            notifications_repository_1.NotificationsRepository,
            notifications_service_1.NotificationsService,
            email_provider_1.EmailProvider,
            push_provider_1.PushProvider,
            line_provider_1.LineProvider,
            telegram_provider_1.TelegramProvider,
        ],
    })
], NotificationsModule);
