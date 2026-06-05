import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestContext } from '../common/types/request-context.type';
import { QueueBridgeService } from '../jobs/queue-bridge.service';
import { buildPlannerExplanation, generateSchedule, toIsoDate, validateAvailabilitySlots } from './planner-engine.util';
import { PlannerRepository } from './planner.repository';
import { GenerateStudyPlanDto } from './dto/generate-study-plan.dto';
import { ReplanDto } from './dto/replan.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';

@Injectable()
export class PlannerService {
  constructor(
    private readonly plannerRepository: PlannerRepository,
    private readonly queueBridgeService: QueueBridgeService,
  ) {}

  async upsertAvailability(user: RequestContext, body: UpsertAvailabilityDto) {
    validateAvailabilitySlots(body.slots);
    await this.plannerRepository.replaceAvailability(user.userId, body.slots);
    return { data: body };
  }

  async generate(user: RequestContext, body: GenerateStudyPlanDto) {
    const slots = await this.plannerRepository.listAvailability(user.userId);
    const lessons = await this.plannerRepository.getPlanningLessons(user.tenantId, user.userId, body.courseId);
    const schedule = generateSchedule(slots, lessons, body.goalCompletionDate);
    const plan = await this.plannerRepository.createStudyPlan(
      user.userId,
      body.courseId,
      body.goalCompletionDate,
      body.strategy,
      schedule.items,
    );
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
        explanation: buildPlannerExplanation(summary),
        items: schedule.items,
        reminderJob,
      },
    };
  }

  async getCurrent(user: RequestContext, courseId: string) {
    const plan = await this.plannerRepository.getCurrentStudyPlan(user.userId, courseId);
    if (!plan) {
      throw new NotFoundException('Study plan not found');
    }

    const items = await this.plannerRepository.getStudyPlanItems(plan.id);
    return {
      data: {
        studyPlanId: plan.id,
        goalCompletionDate: toIsoDate(plan.goalCompletionDate),
        items,
      },
    };
  }

  async replan(user: RequestContext, body: ReplanDto) {
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

  async getStudentPlanner(_user: RequestContext, studentId: string, courseId: string) {
    const student = await this.plannerRepository.getStudentOverview(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const plan = await this.plannerRepository.getCurrentStudyPlan(studentId, courseId);
    const items = plan ? await this.plannerRepository.getStudyPlanItems(plan.id) : [];
    const completionPercent = await this.plannerRepository.getCourseCompletionPercent(studentId, courseId);

    return {
      data: {
        student,
        plan: {
          studyPlanId: plan?.id ?? null,
          goalCompletionDate: toIsoDate(plan?.goalCompletionDate ?? null),
          completionPercent,
          items,
        },
      },
    };
  }
}
