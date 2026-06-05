declare class TreeMoveDto {
    nodeId: string;
    newParentId?: string | null;
    newSortOrder: number;
}
export declare class ReorderTreeDto {
    moves: TreeMoveDto[];
}
export {};
