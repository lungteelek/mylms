export const COURSE_BUILDER_STORAGE_KEY = 'coursechic.courseBuilder.state.v1';
export const COURSE_BUILDER_MAX_DEPTH = 4;

export function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `node_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

export function createLessonNode({ title = 'New lesson', depth = 1, asset = null } = {}) {
  return {
    id: createId(),
    title,
    depth,
    nodeType: depth <= 1 ? 'section' : 'lesson',
    estimatedMinutes: 0,
    contentType: 'article',
    description: '',
    plainText: '',
    htmlContent: '',
    transcriptSegments: [],
    transcriptFullText: '',
    asset: asset ? { ...asset } : { type: 'none', fileName: '', url: '' },
    children: [],
  };
}

export function cloneTree(nodes) {
  return nodes.map((node) => ({
    ...node,
    asset: node.asset ? { ...node.asset } : { type: 'none', fileName: '', url: '' },
    transcriptSegments: Array.isArray(node.transcriptSegments) ? node.transcriptSegments.map((segment) => ({ ...segment })) : [],
    transcriptFullText: node.transcriptFullText || '',
    children: cloneTree(node.children || []),
  }));
}

export function cloneNodeDeep(node, { keepId = false, titleSuffix = ' (copy)' } = {}) {
  return {
    ...node,
    id: keepId ? node.id : createId(),
    title: keepId ? node.title : `${node.title}${titleSuffix}`,
    asset: node.asset ? { ...node.asset } : { type: 'none', fileName: '', url: '' },
    transcriptSegments: Array.isArray(node.transcriptSegments) ? node.transcriptSegments.map((segment) => ({ ...segment })) : [],
    transcriptFullText: node.transcriptFullText || '',
    children: (node.children || []).map((child) => cloneNodeDeep(child, { keepId })),
  };
}

export function normalizeTreeDepths(nodes, depth = 1) {
  return nodes.map((node) => ({
    ...node,
    depth,
    children: normalizeTreeDepths(node.children || [], depth + 1),
  }));
}

export function countNodes(nodes) {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children || []), 0);
}

export function countAssetNodes(nodes) {
  return nodes.reduce((total, node) => {
    const hasAsset = Boolean(node.asset && node.asset.type && node.asset.type !== 'none');
    return total + (hasAsset ? 1 : 0) + countAssetNodes(node.children || []);
  }, 0);
}

export function maxDepth(nodes) {
  return nodes.reduce((depth, node) => Math.max(depth, node.depth || 1, maxDepth(node.children || [])), 0);
}

export function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const child = findNodeById(node.children || [], id);
    if (child) {
      return child;
    }
  }

  return null;
}

export function containsNodeId(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return true;
    }
    if (containsNodeId(node.children || [], id)) {
      return true;
    }
  }

  return false;
}

export function extractNodeById(nodes, id) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (node.id === id) {
      const next = nodes.slice();
      next.splice(index, 1);
      return {
        nodes: next,
        node,
      };
    }

    const childResult = extractNodeById(node.children || [], id);
    if (childResult.node) {
      const next = nodes.slice();
      next[index] = {
        ...node,
        children: childResult.nodes,
      };
      return {
        nodes: next,
        node: childResult.node,
      };
    }
  }

  return {
    nodes,
    node: null,
  };
}

export function insertNodeInside(nodes, targetId, node) {
  return nodes.map((current) => {
    if (current.id === targetId) {
      return {
        ...current,
        children: [...(current.children || []), node],
      };
    }

    return {
      ...current,
      children: insertNodeInside(current.children || [], targetId, node),
    };
  });
}

export function insertNodeAfter(nodes, targetId, node) {
  const next = [];
  let inserted = false;

  for (const current of nodes) {
    next.push({
      ...current,
      children: insertNodeAfter(current.children || [], targetId, node),
    });

    if (!inserted && current.id === targetId) {
      next.push(node);
      inserted = true;
    }
  }

  return next;
}

function reorderInArray(nodes, sourceId, delta) {
  const index = nodes.findIndex((node) => node.id === sourceId);
  if (index !== -1) {
    const next = nodes.slice();
    const targetIndex = Math.max(0, Math.min(next.length - 1, index + delta));
    if (targetIndex === index) {
      return next;
    }
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    return next;
  }

  return nodes.map((node) => ({
    ...node,
    children: reorderInArray(node.children || [], sourceId, delta),
  }));
}

export function moveNodeSibling(nodes, sourceId, delta) {
  return reorderInArray(cloneTree(nodes), sourceId, delta);
}

function duplicateInArray(nodes, sourceId) {
  const index = nodes.findIndex((node) => node.id === sourceId);
  if (index !== -1) {
    const next = nodes.slice();
    const duplicate = cloneNodeDeep(next[index]);
    next.splice(index + 1, 0, duplicate);
    return {
      nodes: next,
      duplicatedId: duplicate.id,
    };
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const childResult = duplicateInArray(nodes[i].children || [], sourceId);
    if (childResult.duplicatedId) {
      const next = nodes.slice();
      next[i] = {
        ...nodes[i],
        children: childResult.nodes,
      };
      return {
        nodes: next,
        duplicatedId: childResult.duplicatedId,
      };
    }
  }

  return {
    nodes,
    duplicatedId: null,
  };
}

export function duplicateNodeById(nodes, sourceId) {
  return duplicateInArray(cloneTree(nodes), sourceId);
}

export function moveNodeInTree(nodes, sourceId, targetId, position = 'after') {
  if (!sourceId || !targetId || sourceId === targetId) {
    return nodes;
  }

  const extracted = extractNodeById(cloneTree(nodes), sourceId);
  if (!extracted.node) {
    return nodes;
  }

  const cleanTree = extracted.nodes;
  const movedNode = extracted.node;

  if (position === 'inside') {
    if (containsNodeId([movedNode], targetId)) {
      return nodes;
    }
    return insertNodeInside(cleanTree, targetId, movedNode);
  }

  if (containsNodeId([movedNode], targetId)) {
    return nodes;
  }

  return insertNodeAfter(cleanTree, targetId, movedNode);
}

export function moveNodeToRoot(nodes, sourceId, targetIndex = null) {
  const extracted = extractNodeById(cloneTree(nodes), sourceId);
  if (!extracted.node) {
    return nodes;
  }

  const next = extracted.nodes.slice();
  const insertAt = targetIndex === null || targetIndex < 0 || targetIndex > next.length ? next.length : targetIndex;
  next.splice(insertAt, 0, extracted.node);
  return next;
}

export function removeNodeById(nodes, id) {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({
      ...node,
      children: removeNodeById(node.children || [], id),
    }));
}

export function getNodePathLabel(pathParts) {
  return pathParts.join('.');
}

export function serializeTree(nodes) {
  return JSON.parse(JSON.stringify(nodes));
}
