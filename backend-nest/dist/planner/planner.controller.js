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
exports.PlannerController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const planner_service_1 = require("./planner.service");
const generate_study_plan_dto_1 = require("./dto/generate-study-plan.dto");
const replan_dto_1 = require("./dto/replan.dto");
const upsert_availability_dto_1 = require("./dto/upsert-availability.dto");
let PlannerController = class PlannerController {
    constructor(plannerService) {
        this.plannerService = plannerService;
    }
    upsertAvailability(user, body) {
        return this.plannerService.upsertAvailability(user, body);
    }
    generate(user, body) {
        return this.plannerService.generate(user, body);
    }
    getCurrent(user, courseId) {
        return this.plannerService.getCurrent(user, courseId);
    }
    replan(user, body) {
        return this.plannerService.replan(user, body);
    }
    getStudentPlanner(user, studentId, courseId) {
        return this.plannerService.getStudentPlanner(user, studentId, courseId);
    }
};
exports.PlannerController = PlannerController;
__decorate([
    (0, common_1.Put)('planner/availability'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upsert_availability_dto_1.UpsertAvailabilityDto]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "upsertAvailability", null);
__decorate([
    (0, common_1.Post)('planner/generate'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, generate_study_plan_dto_1.GenerateStudyPlanDto]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)('planner/current'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "getCurrent", null);
__decorate([
    (0, common_1.Post)('planner/replan'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'tutor', 'student'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, replan_dto_1.ReplanDto]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "replan", null);
__decorate([
    (0, common_1.Get)('admin/students/:studentId/planner'),
    (0, roles_decorator_1.Roles)('owner', 'admin'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('studentId')),
    __param(2, (0, common_1.Query)('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PlannerController.prototype, "getStudentPlanner", null);
exports.PlannerController = PlannerController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [planner_service_1.PlannerService])
], PlannerController);
