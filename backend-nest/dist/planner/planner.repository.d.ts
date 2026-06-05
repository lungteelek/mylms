import { PrismaService } from '../prisma/prisma.service';
import { AvailabilitySlot, GeneratedPlanItem, LessonPlanCandidate } from './types/planner.types';
export declare class PlannerRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    replaceAvailability(userId: string, slots: AvailabilitySlot[]): Promise<void>;
    listAvailability(userId: string): Promise<AvailabilitySlot[]>;
    getPlanningLessons(tenantId: string, userId: string, courseId: string): Promise<LessonPlanCandidate[]>;
    cancelActivePlans(userId: string, courseId: string): Promise<string | null>;
    createStudyPlan(userId: string, courseId: string, goalCompletionDate: string, strategy: string | undefined, items: GeneratedPlanItem[]): Promise<{
        id: string;
        goalCompletionDate: Date | null;
        status: string;
    }>;
    getCurrentStudyPlan(userId: string, courseId: string): Promise<{
        id: string;
        goalCompletionDate: Date | null;
        status: string;
    } | null>;
    getStudyPlanItems(studyPlanId: string): Promise<{
        id: string;
        lessonNodeId: string;
        lessonTitle: string;
        scheduledStartAt: string;
        scheduledEndAt: string;
        plannedMinutes: number;
        status: "not_started" | "in_progress" | "completed";
        aiNotes: string | null;
    }[]>;
    getStudentOverview(studentId: string): Promise<{
        id: string;
        fullName: string;
    } | null>;
    getCourseCompletionPercent(studentId: string, courseId: string): Promise<number>;
}
