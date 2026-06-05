import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { PlannerService } from './planner.service';
import { GenerateStudyPlanDto } from './dto/generate-study-plan.dto';
import { ReplanDto } from './dto/replan.dto';
import { UpsertAvailabilityDto } from './dto/upsert-availability.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Put('planner/availability')
  @Roles('owner', 'admin', 'tutor', 'student')
  upsertAvailability(@CurrentUser() user: RequestContext, @Body() body: UpsertAvailabilityDto) {
    return this.plannerService.upsertAvailability(user, body);
  }

  @Post('planner/generate')
  @Roles('owner', 'admin', 'tutor', 'student')
  generate(@CurrentUser() user: RequestContext, @Body() body: GenerateStudyPlanDto) {
    return this.plannerService.generate(user, body);
  }

  @Get('planner/current')
  @Roles('owner', 'admin', 'tutor', 'student')
  getCurrent(@CurrentUser() user: RequestContext, @Query('courseId') courseId: string) {
    return this.plannerService.getCurrent(user, courseId);
  }

  @Post('planner/replan')
  @Roles('owner', 'admin', 'tutor', 'student')
  replan(@CurrentUser() user: RequestContext, @Body() body: ReplanDto) {
    return this.plannerService.replan(user, body);
  }

  @Get('admin/students/:studentId/planner')
  @Roles('owner', 'admin')
  getStudentPlanner(@CurrentUser() user: RequestContext, @Param('studentId') studentId: string, @Query('courseId') courseId: string) {
    return this.plannerService.getStudentPlanner(user, studentId, courseId);
  }
}
