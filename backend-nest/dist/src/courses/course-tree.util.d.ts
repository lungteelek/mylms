import { LessonNodeRow, LessonNodeTree } from './types/course.types';
export declare function buildLessonTree(rows: LessonNodeRow[]): LessonNodeTree[];
export declare function createNodePath(parentPath: string | null, title: string): string;
export declare function ensureNoTreeCycles(nodeId: string, nextParentId: string | null | undefined, nodeMap: Map<string, LessonNodeRow>): void;
