import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { AiService } from './ai.service';
import { AskTutorDto } from './dto/ask-tutor.dto';
import { GenerateExercisesDto } from './dto/generate-exercises.dto';
import { SummaryDto } from './dto/summary.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiTutorController {
  constructor(private readonly aiService: AiService) {}

  @Post('tutor/query')
  @Roles('owner', 'admin', 'tutor', 'student')
  askTutor(@CurrentUser() user: RequestContext, @Body() body: AskTutorDto) {
    return this.aiService.askTutor(user, body);
  }

  @Post('tutor/summary')
  @Roles('owner', 'admin', 'tutor', 'student')
  summarize(@CurrentUser() user: RequestContext, @Body() body: SummaryDto) {
    return this.aiService.summarize(user, body);
  }

  @Post('tutor/exercises')
  @Roles('owner', 'admin', 'tutor', 'student')
  generateExercises(@CurrentUser() user: RequestContext, @Body() body: GenerateExercisesDto) {
    return this.aiService.generateExercises(user, body);
  }

  @Get('sessions/:sessionId')
  @Roles('owner', 'admin', 'tutor', 'student')
  getSession(@CurrentUser() user: RequestContext, @Param('sessionId') sessionId: string) {
    return this.aiService.getSession(user, sessionId);
  }
}
