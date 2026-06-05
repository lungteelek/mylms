"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAvailabilitySlots = validateAvailabilitySlots;
exports.generateSchedule = generateSchedule;
exports.buildPlannerExplanation = buildPlannerExplanation;
exports.toIsoDate = toIsoDate;
const common_1 = require("@nestjs/common");
function setMinuteOfDay(baseDate, minuteOfDay) {
    const next = new Date(baseDate);
    next.setUTCHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
    return next;
}
function validateAvailabilitySlots(slots) {
    const byDay = new Map();
    for (const slot of slots) {
        if (slot.endMinute <= slot.startMinute) {
            throw new common_1.BadRequestException('Availability slot endMinute must be greater than startMinute');
        }
        const current = byDay.get(slot.weekday) || [];
        current.push(slot);
        byDay.set(slot.weekday, current);
    }
    for (const daySlots of byDay.values()) {
        const sorted = [...daySlots].sort((a, b) => a.startMinute - b.startMinute);
        for (let i = 1; i < sorted.length; i += 1) {
            if (sorted[i].startMinute < sorted[i - 1].endMinute) {
                throw new common_1.BadRequestException('Availability slots must not overlap');
            }
        }
    }
}
function buildLessonQueue(lessons) {
    return lessons
        .filter((lesson) => lesson.status !== 'completed')
        .map((lesson) => {
        const estimated = lesson.estimatedMinutes > 0 ? lesson.estimatedMinutes : 15;
        const remainingMinutes = Math.max(5, Math.ceil(estimated * (1 - lesson.progressPercent / 100)));
        return {
            lessonNodeId: lesson.lessonNodeId,
            lessonTitle: lesson.lessonTitle,
            remainingMinutes,
        };
    })
        .filter((lesson) => lesson.remainingMinutes > 0);
}
function generateSchedule(slots, lessons, goalCompletionDate) {
    validateAvailabilitySlots(slots);
    const queue = buildLessonQueue(lessons);
    if (queue.length === 0) {
        return {
            items: [],
            totalMinutes: 0,
            sessionsPerWeek: 0,
            totalLessons: 0,
        };
    }
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(goalCompletionDate);
    endDate.setUTCHours(23, 59, 59, 999);
    if (endDate.getTime() <= startDate.getTime()) {
        throw new common_1.BadRequestException('goalCompletionDate must be in the future');
    }
    const requiredMinutes = queue.reduce((sum, lesson) => sum + lesson.remainingMinutes, 0);
    const items = [];
    const activeWeekdays = new Set(slots.map((slot) => slot.weekday));
    for (const date = new Date(startDate); date <= endDate && queue.length > 0; date.setUTCDate(date.getUTCDate() + 1)) {
        const weekday = date.getUTCDay();
        const daySlots = slots
            .filter((slot) => slot.weekday === weekday)
            .sort((a, b) => a.startMinute - b.startMinute);
        for (const slot of daySlots) {
            let cursor = slot.startMinute;
            while (cursor < slot.endMinute && queue.length > 0) {
                const current = queue[0];
                const available = slot.endMinute - cursor;
                const chunk = Math.min(current.remainingMinutes, available, Math.max(slot.preferredMinutes, 1));
                if (chunk <= 0) {
                    break;
                }
                items.push({
                    lessonNodeId: current.lessonNodeId,
                    lessonTitle: current.lessonTitle,
                    scheduledStartAt: setMinuteOfDay(date, cursor).toISOString(),
                    scheduledEndAt: setMinuteOfDay(date, cursor + chunk).toISOString(),
                    plannedMinutes: chunk,
                    status: 'not_started',
                    aiNotes: null,
                });
                current.remainingMinutes -= chunk;
                cursor += chunk;
                if (current.remainingMinutes <= 0) {
                    queue.shift();
                }
            }
        }
    }
    const totalMinutes = items.reduce((sum, item) => sum + item.plannedMinutes, 0);
    if (totalMinutes < requiredMinutes) {
        throw new common_1.BadRequestException(`Insufficient available study time. Add at least ${requiredMinutes - totalMinutes} more minutes before the target date.`);
    }
    return {
        items,
        totalMinutes,
        sessionsPerWeek: activeWeekdays.size,
        totalLessons: lessons.filter((lesson) => lesson.status !== 'completed').length,
    };
}
function buildPlannerExplanation(input) {
    return `ระบบจัดแผนจาก ${input.totalLessons} บท ใช้เวลา ${input.totalPlannedMinutes} นาที และกระจายเรียน ${input.sessionsPerWeek} วันต่อสัปดาห์`;
}
function toIsoDate(date) {
    return date ? date.toISOString().slice(0, 10) : null;
}
