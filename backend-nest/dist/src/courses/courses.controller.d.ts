import { RequestContext } from '../common/types/request-context.type';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { ReorderTreeDto } from './dto/reorder-tree.dto';
export declare class CoursesController {
    private readonly coursesService;
    constructor(coursesService: CoursesService);
    createCourse(user: RequestContext, body: CreateCourseDto): Promise<{
        data: import("./types/course.types").CourseRow;
    }>;
    getCourseTree(user: RequestContext, courseId: string): Promise<{
        data: {
            course: import("./types/course.types").CourseRow;
            nodes: import("./types/course.types").LessonNodeTree[];
        };
    }>;
    reorderTree(user: RequestContext, courseId: string, body: ReorderTreeDto): Promise<{
        data: {
            courseId: string;
            updated: number;
        };
    }>;
    deleteTree(user: RequestContext, courseId: string): Promise<{
        data: {
            courseId: string;
            deleted: boolean;
        };
    }>;
    publishCourse(user: RequestContext, courseId: string): Promise<{
        data: {
            id: string;
            status: string;
            publishedAt: string;
        };
    }>;
}
