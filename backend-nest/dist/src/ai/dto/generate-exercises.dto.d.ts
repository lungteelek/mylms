export declare class GenerateExercisesDto {
    courseId: string;
    lessonNodeId?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    count: number;
    type: 'multiple_choice' | 'short_answer';
}
