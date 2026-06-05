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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const list_notifications_dto_1 = require("./dto/list-notifications.dto");
const register_notification_device_dto_1 = require("./dto/register-notification-device.dto");
const notifications_service_1 = require("./notifications.service");
const queue_bridge_service_1 = require("../jobs/queue-bridge.service");
let NotificationsController = class NotificationsController {
    constructor(notificationsService, queueBridgeService) {
        this.notificationsService = notificationsService;
        this.queueBridgeService = queueBridgeService;
    }
    getInbox(user, query) {
        return this.notificationsService.getInbox(user.userId, query.limit);
    }
    registerDevice(user, body) {
        return this.notificationsService.registerDevice(user.userId, body);
    }
    unregisterDevice(user, platform, pushToken) {
        return this.notificationsService.unregisterDevice(user.userId, platform, pushToken);
    }
    markAsRead(user, notificationId) {
        return this.notificationsService.markAsRead(user.userId, notificationId);
    }
    dispatchNow() {
        return this.queueBridgeService.enqueueDispatchNotifications();
    }
};
exports.NotificationsController = NotificationsController;
__decorate([
    (0, common_1.Get)('inbox'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_notifications_dto_1.ListNotificationsDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "getInbox", null);
__decorate([
    (0, common_1.Post)('devices'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, register_notification_device_dto_1.RegisterNotificationDeviceDto]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "registerDevice", null);
__decorate([
    (0, common_1.Delete)('devices/:platform/:pushToken'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('platform')),
    __param(2, (0, common_1.Param)('pushToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "unregisterDevice", null);
__decorate([
    (0, common_1.Post)(':notificationId/read'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('notificationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Post)('dispatch'),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "dispatchNow", null);
exports.NotificationsController = NotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        queue_bridge_service_1.QueueBridgeService])
], NotificationsController);
