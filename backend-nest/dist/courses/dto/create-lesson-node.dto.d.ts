export declare class CreateLessonNodeDto {
    parentId?: string;
    nodeType: 'section' | 'lesson' | 'quiz' | 'assignment';
    title: string;
    estimatedMinutes?: number;
}
