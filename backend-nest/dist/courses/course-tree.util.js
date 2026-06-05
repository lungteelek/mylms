"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildLessonTree = buildLessonTree;
exports.createNodePath = createNodePath;
exports.ensureNoTreeCycles = ensureNoTreeCycles;
const common_1 = require("@nestjs/common");
const slugify_1 = require("../common/utils/slugify");
function buildLessonTree(rows) {
    const map = new Map();
    const roots = [];
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
    const sortNodes = (nodes) => {
        nodes.sort((a, b) => a.sortOrder - b.sortOrder);
        nodes.forEach((node) => sortNodes(node.children));
    };
    sortNodes(roots);
    return roots;
}
function createNodePath(parentPath, title) {
    const segment = (0, slugify_1.slugify)(title) || 'node';
    return parentPath ? `${parentPath}.${segment}` : segment;
}
function ensureNoTreeCycles(nodeId, nextParentId, nodeMap) {
    if (!nextParentId) {
        return;
    }
    if (nextParentId === nodeId) {
        throw new common_1.BadRequestException('A node cannot be its own parent');
    }
    let cursor = nextParentId;
    while (cursor) {
        if (cursor === nodeId) {
            throw new common_1.BadRequestException('Move would create a cycle in the lesson tree');
        }
        cursor = nodeMap.get(cursor)?.parentId;
    }
}
