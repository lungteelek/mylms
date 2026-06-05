import { BadRequestException } from '@nestjs/common';
import { slugify } from '../common/utils/slugify';
import { LessonNodeRow, LessonNodeTree } from './types/course.types';

export function buildLessonTree(rows: LessonNodeRow[]): LessonNodeTree[] {
  const map = new Map<string, LessonNodeTree>();
  const roots: LessonNodeTree[] = [];

  for (const row of rows) {
    map.set(row.id, { ...row, children: [] });
  }

  for (const node of map.values()) {
    if (node.parentId) {
      const parent = map.get(node.parentId);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }
    roots.push(node);
  }

  const sortNodes = (nodes: LessonNodeTree[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((node) => sortNodes(node.children));
  };

  sortNodes(roots);
  return roots;
}

export function createNodePath(parentPath: string | null, title: string) {
  const segment = slugify(title) || 'node';
  return parentPath ? `${parentPath}.${segment}` : segment;
}

export function ensureNoTreeCycles(
  nodeId: string,
  nextParentId: string | null | undefined,
  nodeMap: Map<string, LessonNodeRow>,
) {
  if (!nextParentId) {
    return;
  }

  if (nextParentId === nodeId) {
    throw new BadRequestException('A node cannot be its own parent');
  }

  let cursor: string | null | undefined = nextParentId;
  while (cursor) {
    if (cursor === nodeId) {
      throw new BadRequestException('Move would create a cycle in the lesson tree');
    }
    cursor = nodeMap.get(cursor)?.parentId;
  }
}
