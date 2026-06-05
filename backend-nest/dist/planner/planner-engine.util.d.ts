import { AvailabilitySlot, GeneratedPlanItem, LessonPlanCandidate } from './types/planner.types';
export declare function validateAvailabilitySlots(slots: AvailabilitySlot[]): void;
export declare function generateSchedule(slots: AvailabilitySlot[], lessons: LessonPlanCandidate[], goalCompletionDate: string): {
    items: GeneratedPlanItem[];
    totalMinutes: number;
    sessionsPerWeek: number;
    totalLessons: number;
};
export declare function buildPlannerExplanation(input: {
    totalLessons: number;
    totalPlannedMinutes: number;
    sessionsPerWeek: number;
}): string;
export declare function toIsoDate(date: Date | null): string | null;
