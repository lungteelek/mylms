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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlannerService = void 0;
const common_1 = require("@nestjs/common");
const queue_bridge_service_1 = require("../jobs/queue-bridge.service");
const planner_engine_util_1 = require("./planner-engine.util");
const planner_repository_1 = require("./planner.repository");
let PlannerService = class PlannerService {
    constructor(plannerRepository, queueBridgeService) {
        this.plannerRepository = plannerRepository;
        this.queueBridgeService = queueBridgeService;
    }
    async upsertAvailability(user, body) {
        (0, planner_engine_util_1.validateAvailabilitySlots)(body.slots);
        await this.plannerRepository.replaceAvailability(user.userId, body.slots);
        return { data: body };
    }
    async generate(user, body) {
        const slots = await this.plannerRepository.listAvailability(user.userId);
        const lessons = await this.plannerRepository.getPlanningLessons(user.tenantId, user.userId, body.courseId);
        const schedule = (0, planner_engine_util_1.generateSchedule)(slots, lessons, body.goalCompletionDate);
        const plan = await this.plannerRepository.createStudyPlan(user.userId, body.courseId, body.goalCompletionDate, body.strategy, schedule.items);
        const summary = {
            totalLessons: schedule.totalLessons,
            totalPlannedMinutes: schedule.totalMinutes,
            sessionsPerWeek: schedule.sessionsPerWeek,
        };
        const reminderJob = await this.queueBridgeService.enqueueSchedulePlanReminders({
            userId: user.userId,
            studyPlanId: plan.id,
        });
        return {
            data: {
                studyPlanId: plan.id,
                status: plan.status,
                goalCompletionDate: body.goalCompletionDate,
                summary,
                explanation: (0, planner_engine_util_1.buildPlannerExplanation)(summary),
                items: schedule.items,
                reminderJob,
            },
        };
    }
    async getCurrent(user, courseId) {
        const plan = await this.plannerRepository.getCurrentStudyPlan(user.userId, courseId);
        if (!plan) {
            throw new common_1.NotFoundException('Study plan not found');
        }
        const items = await this.plannerRepository.getStudyPlanItems(plan.id);
        return {
            data: {
                studyPlanId: plan.id,
                goalCompletionDate: (0, planner_engine_util_1.toIsoDate)(plan.goalCompletionDate),
                items,
            },
        };
    }
    async replan(user, body) {
        const replacedStudyPlanId = await this.plannerRepository.cancelActivePlans(user.userId, body.courseId);
        const fallbackGoalDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const result = await this.generate(user, {
            courseId: body.courseId,
            goalCompletionDate: body.goalCompletionDate ?? fallbackGoalDate,
            strategy: body.reason,
        });
        return {
            data: {
                studyPlanId: result.data.studyPlanId,
                replacedStudyPlanId,
                status: result.data.status,
                explanation: `มีการปรับแผนใหม่เนื่องจาก ${body.reason}`,
            },
        };
    }
    async getStudentPlanner(_user, studentId, courseId) {
        const student = await this.plannerRepository.getStudentOverview(studentId);
        if (!student) {
            throw new common_1.NotFoundException('Student not found');
        }
        const plan = await this.plannerRepository.getCurrentStudyPlan(studentId, courseId);
        const items = plan ? await this.plannerRepository.getStudyPlanItems(plan.id) : [];
        const completionPercent = await this.plannerRepository.getCourseCompletionPercent(studentId, courseId);
        return {
            data: {
                student,
                plan: {
                    studyPlanId: plan?.id ?? null,
                    goalCompletionDate: (0, planner_engine_util_1.toIsoDate)(plan?.goalCompletionDate ?? null),
                    completionPercent,
                    items,
                },
            },
        };
    }
};
exports.PlannerService = PlannerService;
exports.PlannerService = PlannerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [planner_repository_1.PlannerRepository,
        queue_bridge_service_1.QueueBridgeService])
], PlannerService);
