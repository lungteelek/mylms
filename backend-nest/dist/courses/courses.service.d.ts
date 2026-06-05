import { RequestContext } from '../common/types/request-context.type';
import { CoursesRepository } from './courses.repository';
import { CreateCourseDto } from './dto/create-course.dto';
import { ReorderTreeDto } from './dto/reorder-tree.dto';
import { LessonNodeTree } from './types/course.types';
export declare class CoursesService {
    private readonly coursesRepository;
    constructor(coursesRepository: CoursesRepository);
    listCourses(user: RequestContext): Promise<{
        data: {
            items: import("./types/course.types").CourseRow[];
        };
    }>;
    createCourse(user: RequestContext, body: CreateCourseDto): Promise<{
        data: import("./types/course.types").CourseRow;
    }>;
    getCourseTree(user: RequestContext, courseId: string): Promise<{
        data: {
            course: import("./types/course.types").CourseRow;
            nodes: LessonNodeTree[];
        };
    }>;
    reorderTree(user: RequestContext, courseId: string, body: ReorderTreeDto): Promise<{
        data: {
            courseId: string;
            updated: number;
        };
    }>;
    publishCourse(user: RequestContext, courseId: string): Promise<{
        data: {
            id: string;
            status: string;
            publishedAt: string;
        };
    }>;
    deleteCourseTree(user: RequestContext, courseId: string): Promise<{
        data: {
            courseId: string;
            deleted: boolean;
        };
    }>;
    private attachAssets;
    private attachTranscripts;
}
