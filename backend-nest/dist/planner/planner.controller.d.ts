import { RequestContext } from '../common/types/request-context.type';
import { PlannerService } from './planner.service';
import { GenerateStudyPlanDto } from './dto/generate-study-plan.dto';
import { ReplanDto } from './dto/replan.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';
export declare class PlannerController {
    private readonly plannerService;
    constructor(plannerService: PlannerService);
    upsertAvailability(user: RequestContext, body: UpsertAvailabilityDto): Promise<{
        data: UpsertAvailabilityDto;
    }>;
    generate(user: RequestContext, body: GenerateStudyPlanDto): Promise<{
        data: {
            studyPlanId: string;
            status: string;
            goalCompletionDate: string;
            summary: {
                totalLessons: number;
                totalPlannedMinutes: number;
                sessionsPerWeek: number;
            };
            explanation: string;
            items: import("./types/planner.types").GeneratedPlanItem[];
            reminderJob: {
                queue: string;
                jobName: "schedule-plan-reminders";
            };
        };
    }>;
    getCurrent(user: RequestContext, courseId: string): Promise<{
        data: {
            studyPlanId: string;
            goalCompletionDate: string | null;
            items: {
                id: string;
                lessonNodeId: string;
                lessonTitle: string;
                scheduledStartAt: string;
                scheduledEndAt: string;
                plannedMinutes: number;
                status: "not_started" | "in_progress" | "completed";
                aiNotes: string | null;
            }[];
        };
    }>;
    replan(user: RequestContext, body: ReplanDto): Promise<{
        data: {
            studyPlanId: string;
            replacedStudyPlanId: string | null;
            status: string;
            explanation: string;
        };
    }>;
    getStudentPlanner(user: RequestContext, studentId: string, courseId: string): Promise<{
        data: {
            student: {
                id: string;
                fullName: string;
            };
            plan: {
                studyPlanId: string | null;
                goalCompletionDate: string | null;
                completionPercent: number;
                items: {
                    id: string;
                    lessonNodeId: string;
                    lessonTitle: string;
                    scheduledStartAt: string;
                    scheduledEndAt: string;
                    plannedMinutes: number;
                    status: "not_started" | "in_progress" | "completed";
                    aiNotes: string | null;
                }[];
            };
        };
    }>;
}
