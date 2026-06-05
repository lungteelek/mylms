import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

class TreeMoveDto {
  @IsString()
  nodeId!: string;

  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @IsInt()
  newSortOrder!: number;
}

export class ReorderTreeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TreeMoveDto)
  moves!: TreeMoveDto[];
}
