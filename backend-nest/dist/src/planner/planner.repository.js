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
exports.PlannerRepository = void 0;
const common_1 = require("@nestjs/common");
const lms_client_1 = require("../../../backend/generated/lms-client");
const prisma_service_1 = require("../prisma/prisma.service");
function normalizeId(value) {
    return typeof value === 'bigint' ? value.toString() : String(value);
}
let PlannerRepository = class PlannerRepository {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async replaceAvailability(userId, slots) {
        await this.prisma.$transaction(async (tx) => {
            await tx.$executeRaw(lms_client_1.Prisma.sql `DELETE FROM study_availability WHERE user_id = ${BigInt(userId)}`);
            for (const slot of slots) {
                await tx.$executeRaw(lms_client_1.Prisma.sql `
          INSERT INTO study_availability (user_id, weekday, start_minute, end_minute, preferred_minutes, active)
          VALUES (${BigInt(userId)}, ${slot.weekday}, ${slot.startMinute}, ${slot.endMinute}, ${slot.preferredMinutes}, true)
        `);
            }
        });
    }
    async listAvailability(userId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, weekday, start_minute, end_minute, preferred_minutes
      FROM study_availability
      WHERE user_id = ${BigInt(userId)} AND active = true
      ORDER BY weekday ASC, start_minute ASC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            weekday: Number(row.weekday),
            startMinute: Number(row.start_minute),
            endMinute: Number(row.end_minute),
            preferredMinutes: Number(row.preferred_minutes),
        }));
    }
    async getPlanningLessons(tenantId, userId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        ln.id AS lesson_node_id,
        ln.title AS lesson_title,
        ln.estimated_minutes,
        lp.progress_percent,
        lp.status AS progress_status
      FROM lesson_nodes ln
      JOIN enrollments e
        ON e.course_id = ln.course_id
       AND e.user_id = ${BigInt(userId)}
       AND e.tenant_id = ${BigInt(tenantId)}
      LEFT JOIN lesson_progress lp
        ON lp.enrollment_id = e.id
       AND lp.lesson_node_id = ln.id
      WHERE ln.tenant_id = ${BigInt(tenantId)}
        AND ln.course_id = ${BigInt(courseId)}
        AND ln.node_type = 'lesson'
      ORDER BY ln.path ASC, ln.sort_order ASC
    `);
        return rows.map((row) => ({
            lessonNodeId: normalizeId(row.lesson_node_id),
            lessonTitle: row.lesson_title,
            estimatedMinutes: Number(row.estimated_minutes || 0),
            progressPercent: Number(row.progress_percent || 0),
            status: row.progress_status || 'not_started',
        }));
    }
    async cancelActivePlans(userId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id
      FROM study_plans
      WHERE user_id = ${BigInt(userId)} AND course_id = ${BigInt(courseId)} AND status = 'active'
      ORDER BY created_at DESC
    `);
        if (!rows[0]) {
            return null;
        }
        await this.prisma.$executeRaw(lms_client_1.Prisma.sql `
      UPDATE study_plans
      SET status = 'cancelled', updated_at = now()
      WHERE user_id = ${BigInt(userId)} AND course_id = ${BigInt(courseId)} AND status = 'active'
    `);
        return normalizeId(rows[0].id);
    }
    async createStudyPlan(userId, courseId, goalCompletionDate, strategy, items) {
        return this.prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw(lms_client_1.Prisma.sql `
        INSERT INTO study_plans (user_id, course_id, goal_completion_date, strategy, status, generated_by, created_at, updated_at)
        VALUES (${BigInt(userId)}, ${BigInt(courseId)}, ${goalCompletionDate}::date, ${strategy ?? null}, 'active', 'ai', now(), now())
        RETURNING id, goal_completion_date, status
      `);
            const planId = normalizeId(rows[0].id);
            for (const item of items) {
                await tx.$executeRaw(lms_client_1.Prisma.sql `
          INSERT INTO study_plan_items (study_plan_id, lesson_node_id, scheduled_start_at, scheduled_end_at, planned_minutes, status, ai_notes)
          VALUES (
            ${BigInt(planId)},
            ${BigInt(item.lessonNodeId)},
            ${item.scheduledStartAt}::timestamptz,
            ${item.scheduledEndAt}::timestamptz,
            ${item.plannedMinutes},
            ${item.status},
            ${item.aiNotes ?? null}
          )
        `);
            }
            return {
                id: planId,
                goalCompletionDate: rows[0].goal_completion_date,
                status: rows[0].status,
            };
        });
    }
    async getCurrentStudyPlan(userId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, goal_completion_date, status
      FROM study_plans
      WHERE user_id = ${BigInt(userId)} AND course_id = ${BigInt(courseId)} AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `);
        if (!rows[0]) {
            return null;
        }
        return {
            id: normalizeId(rows[0].id),
            goalCompletionDate: rows[0].goal_completion_date,
            status: rows[0].status,
        };
    }
    async getStudyPlanItems(studyPlanId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT
        spi.id,
        spi.lesson_node_id,
        ln.title AS lesson_title,
        spi.scheduled_start_at,
        spi.scheduled_end_at,
        spi.planned_minutes,
        spi.status,
        spi.ai_notes
      FROM study_plan_items spi
      JOIN lesson_nodes ln ON ln.id = spi.lesson_node_id
      WHERE spi.study_plan_id = ${BigInt(studyPlanId)}
      ORDER BY spi.scheduled_start_at ASC
    `);
        return rows.map((row) => ({
            id: normalizeId(row.id),
            lessonNodeId: normalizeId(row.lesson_node_id),
            lessonTitle: row.lesson_title,
            scheduledStartAt: row.scheduled_start_at.toISOString(),
            scheduledEndAt: row.scheduled_end_at.toISOString(),
            plannedMinutes: Number(row.planned_minutes),
            status: row.status,
            aiNotes: row.ai_notes,
        }));
    }
    async getStudentOverview(studentId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT id, full_name
      FROM users
      WHERE id = ${BigInt(studentId)}
      LIMIT 1
    `);
        if (!rows[0]) {
            return null;
        }
        return {
            id: normalizeId(rows[0].id),
            fullName: rows[0].full_name,
        };
    }
    async getCourseCompletionPercent(studentId, courseId) {
        const rows = await this.prisma.$queryRaw(lms_client_1.Prisma.sql `
      SELECT AVG(COALESCE(lp.progress_percent, 0)) AS completion_percent
      FROM enrollments e
      JOIN lesson_nodes ln ON ln.course_id = e.course_id AND ln.node_type = 'lesson'
      LEFT JOIN lesson_progress lp ON lp.enrollment_id = e.id AND lp.lesson_node_id = ln.id
      WHERE e.user_id = ${BigInt(studentId)} AND e.course_id = ${BigInt(courseId)}
    `);
        return Number(rows[0]?.completion_percent || 0);
    }
};
exports.PlannerRepository = PlannerRepository;
exports.PlannerRepository = PlannerRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlannerRepository);
