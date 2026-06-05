import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequestContext } from '../common/types/request-context.type';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ReorderTreeDto } from './dto/reorder-tree.dto';

@Controller('courses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @Roles('owner', 'admin', 'tutor', 'student')
  listCourses(@CurrentUser() user: RequestContext) {
    return this.coursesService.listCourses(user);
  }

  @Post()
  @Roles('owner', 'admin', 'tutor')
  createCourse(@CurrentUser() user: RequestContext, @Body() body: CreateCourseDto) {
    return this.coursesService.createCourse(user, body);
  }

  @Get(':courseId/tree')
  @Roles('owner', 'admin', 'tutor', 'student')
  getCourseTree(@CurrentUser() user: RequestContext, @Param('courseId') courseId: string) {
    return this.coursesService.getCourseTree(user, courseId);
  }

  @Patch(':courseId/tree/reorder')
  @Roles('owner', 'admin', 'tutor')
  reorderTree(@CurrentUser() user: RequestContext, @Param('courseId') courseId: string, @Body() body: ReorderTreeDto) {
    return this.coursesService.reorderTree(user, courseId, body);
  }

  @Delete(':courseId/tree')
  @Roles('owner', 'admin', 'tutor')
  deleteTree(@CurrentUser() user: RequestContext, @Param('courseId') courseId: string) {
    return this.coursesService.deleteCourseTree(user, courseId);
  }

  @Post(':courseId/publish')
  @Roles('owner', 'admin', 'tutor')
  publishCourse(@CurrentUser() user: RequestContext, @Param('courseId') courseId: string) {
    return this.coursesService.publishCourse(user, courseId);
  }
}
