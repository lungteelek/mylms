import {
  COURSE_BUILDER_MAX_DEPTH,
  COURSE_BUILDER_STORAGE_KEY,
  cloneTree,
  countAssetNodes,
  countNodes,
  createLessonNode,
  duplicateNodeById,
  normalizeTreeDepths,
  findNodeById,
  getNodePathLabel,
  maxDepth,
  moveNodeInTree,
  moveNodeSibling,
  moveNodeToRoot,
  removeNodeById,
} from './course-builder-utils.js';
import { createDemoCourseBuilderState } from './course-builder-seed.js';

const styles = `
  :host {
    display: block;
    font-family: inherit;
    color: var(--text, #112033);
  }

  .builder {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border-radius: 20px;
    background: linear-gradient(180deg, rgba(255,255,255,.9), rgba(248,251,255,.9));
    border: 1px solid rgba(15,23,42,.08);
    box-shadow: 0 18px 40px rgba(15,23,42,.08);
  }

  :host-context(body.theme-dark) .builder {
    background: linear-gradient(180deg, rgba(11,19,34,.98), rgba(11,19,34,.92));
    border-color: rgba(125,211,252,.16);
    box-shadow: 0 24px 70px rgba(0,0,0,.34);
    color: #eef5ff;
  }

  .builder-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .title-block h3 {
    margin: 0 0 .25rem;
    font-size: 1rem;
    line-height: 1.2;
    letter-spacing: -.02em;
  }

  .title-block p {
    margin: 0;
    color: var(--muted, #607089);
    font-size: .86rem;
  }

  :host-context(body.theme-dark) .title-block p,
  :host-context(body.theme-dark) .details-head p,
  :host-context(body.theme-dark) .asset-label,
  :host-context(body.theme-dark) .asset-meta,
  :host-context(body.theme-dark) .node-depth,
  :host-context(body.theme-dark) .pill.subtle,
  :host-context(body.theme-dark) .details-head h4,
  :host-context(body.theme-dark) .asset-file {
    color: #d7e4f4;
  }

  .toolbar {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    padding: .38rem .65rem;
    border-radius: 999px;
    font-size: .74rem;
    font-weight: 700;
    background: rgba(11,123,220,.07);
    color: #0b7bdc;
    border: 1px solid rgba(11,123,220,.12);
  }

  .pill.subtle {
    background: rgba(255,255,255,.86);
    color: var(--muted, #607089);
    border-color: rgba(15,23,42,.08);
  }

  :host-context(body.theme-dark) .pill {
    background: rgba(90,211,255,.12);
    color: #eef5ff;
    border-color: rgba(90,211,255,.18);
  }

  :host-context(body.theme-dark) .pill.subtle {
    background: rgba(255,255,255,.06);
    color: #d7e4f4;
    border-color: rgba(125,211,252,.12);
  }

  .button {
    appearance: none;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.86);
    color: var(--text, #112033);
    border-radius: 999px;
    padding: .7rem .9rem;
    font: inherit;
    font-size: .88rem;
    font-weight: 600;
    cursor: pointer;
    transition: transform .18s ease, background .18s ease, border-color .18s ease;
  }

  :host-context(body.theme-dark) .button {
    background: rgba(7,17,31,.92);
    color: #eef5ff;
    border-color: rgba(125,211,252,.12);
  }

  .button:hover { transform: translateY(-1px); }
  .button.primary {
    border: 0;
    color: #fff;
    background: linear-gradient(135deg, #0b7bdc, #4f8cf7);
    box-shadow: 0 12px 26px rgba(11,123,220,.22);
  }

  .button.danger {
    color: #be123c;
    background: rgba(244,63,94,.08);
    border-color: rgba(244,63,94,.16);
  }

  .button:disabled {
    opacity: .42;
    cursor: not-allowed;
    transform: none;
  }

  .meta {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
  }

  .builder-tree {
    display: grid;
    gap: .9rem;
  }

  .builder-tree.droppable {
    padding: .2rem;
    border-radius: 18px;
  }

  .node {
    border: 1px solid rgba(15,23,42,.08);
    border-radius: 18px;
    background: rgba(255,255,255,.9);
    overflow: hidden;
  }

  :host-context(body.theme-dark) .node {
    background: rgba(7,17,31,.94);
    border-color: rgba(125,211,252,.12);
  }

  .node.selected {
    border-color: rgba(11,123,220,.22);
    box-shadow: 0 0 0 3px rgba(11,123,220,.06);
  }

  :host-context(body.theme-dark) .node.selected {
    border-color: rgba(90,211,255,.28);
    box-shadow: 0 0 0 3px rgba(90,211,255,.10);
  }

  .node.dragging {
    opacity: .45;
    transform: scale(.995);
  }

  .node-head {
    display: flex;
    justify-content: space-between;
    gap: .75rem;
    align-items: flex-start;
    padding: .85rem .9rem .65rem;
    background: linear-gradient(180deg, rgba(11,123,220,.03), transparent);
  }

  :host-context(body.theme-dark) .node-head {
    background: linear-gradient(180deg, rgba(90,211,255,.04), transparent);
  }

  .node-label {
    display: inline-flex;
    align-items: center;
    gap: .45rem;
    margin-bottom: .45rem;
    flex-wrap: wrap;
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 999px;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.92);
    color: #7c8aa4;
    font-size: .82rem;
    letter-spacing: -0.15em;
    cursor: grab;
    user-select: none;
  }

  :host-context(body.theme-dark) .drag-handle {
    background: rgba(255,255,255,.05);
    border-color: rgba(125,211,252,.12);
    color: #c9d8ec;
  }

  .node-path {
    font-size: .74rem;
    font-weight: 800;
    color: #0b7bdc;
    background: rgba(11,123,220,.08);
    border: 1px solid rgba(11,123,220,.12);
    border-radius: 999px;
    padding: .3rem .5rem;
  }

  :host-context(body.theme-dark) .node-path {
    background: rgba(90,211,255,.12);
    border-color: rgba(90,211,255,.22);
    color: #f3f8ff;
  }

  .node-depth {
    font-size: .72rem;
    color: var(--muted, #607089);
  }

  .node-title {
    width: 100%;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.96);
    border-radius: 14px;
    padding: .74rem .8rem;
    font: inherit;
    font-weight: 600;
    color: var(--text, #112033);
  }

  :host-context(body.theme-dark) .node-title,
  :host-context(body.theme-dark) .asset-input,
  :host-context(body.theme-dark) .url-input {
    background: rgba(7,17,31,.98);
    color: #f3f8ff;
    border-color: rgba(125,211,252,.16);
  }

  .node-title:focus-visible,
  .url-input:focus-visible,
  .asset-input:focus-visible {
    outline: 2px solid rgba(11,123,220,.75);
    outline-offset: 2px;
  }

  .node-actions {
    display: flex;
    gap: .4rem;
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 9rem;
  }

  .node-body {
    display: grid;
    gap: .75rem;
    padding: 0 .9rem .9rem;
  }

  .asset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .7rem;
  }

  .asset-box {
    display: grid;
    gap: .45rem;
    padding: .8rem;
    border-radius: 16px;
    background: rgba(248,251,255,.95);
    border: 1px solid rgba(15,23,42,.06);
  }

  :host-context(body.theme-dark) .asset-box {
    background: rgba(7,17,31,.92);
    border-color: rgba(125,211,252,.12);
  }

  .asset-box header {
    display: flex;
    justify-content: space-between;
    gap: .5rem;
    align-items: center;
    font-size: .76rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--muted, #607089);
  }

  .asset-label {
    font-size: .77rem;
    color: var(--muted, #607089);
  }

  .asset-input,
  .url-input {
    width: 100%;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.96);
    border-radius: 12px;
    padding: .68rem .75rem;
    font: inherit;
    font-size: .88rem;
    color: var(--text, #112033);
  }

  .asset-meta {
    display: flex;
    justify-content: space-between;
    gap: .75rem;
    align-items: center;
    font-size: .78rem;
    color: var(--muted, #607089);
  }

  .asset-file {
    font-weight: 600;
    color: var(--text, #112033);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .children {
    display: grid;
    gap: .75rem;
    padding: 0 .9rem .9rem 1.3rem;
    border-left: 1px dashed rgba(15,23,42,.12);
    margin-left: 1.15rem;
  }

  :host-context(body.theme-dark) .children {
    border-left-color: rgba(125,211,252,.14);
  }

  .children.droppable {
    transition: background .15s ease, border-color .15s ease;
  }

  .children.drop-active {
    background: rgba(11,123,220,.06);
    border-left-color: rgba(11,123,220,.35);
    border-radius: 16px;
  }

  .empty {
    padding: 1rem;
    border-radius: 16px;
    background: rgba(255,255,255,.82);
    border: 1px dashed rgba(15,23,42,.12);
    color: var(--muted, #607089);
    font-size: .9rem;
  }

  :host-context(body.theme-dark) .empty {
    background: rgba(7,17,31,.98);
    border-color: rgba(125,211,252,.18);
    color: #f1f7ff;
  }

  .summary {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
  }

  .summary .pill {
    background: rgba(255,255,255,.88);
    color: var(--text, #112033);
    border-color: rgba(15,23,42,.08);
  }

  .builder-body {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(300px, .85fr);
    gap: 1rem;
    align-items: start;
  }

  .builder-main,
  .details-panel {
    min-width: 0;
  }

  :host-context(body.theme-dark) .details-panel {
    background: rgba(7,17,31,.96);
    border-color: rgba(125,211,252,.12);
    box-shadow: 0 14px 34px rgba(0,0,0,.34);
  }

  .details-panel {
    position: sticky;
    top: 1rem;
    display: grid;
    gap: .85rem;
    padding: 1rem;
    border-radius: 18px;
    background: rgba(255,255,255,.92);
    border: 1px solid rgba(15,23,42,.08);
    box-shadow: 0 10px 28px rgba(15,23,42,.06);
  }

  .details-head {
    display: grid;
    gap: .35rem;
  }

  .details-head h4 {
    margin: 0;
    font-size: .98rem;
    letter-spacing: -.02em;
  }

  .details-head p {
    margin: 0;
    color: var(--muted, #607089);
    font-size: .84rem;
    line-height: 1.5;
  }

  .details-form {
    display: grid;
    gap: .75rem;
  }

  .field {
    display: grid;
    gap: .35rem;
  }

  .field label {
    font-size: .78rem;
    font-weight: 700;
    color: #43536b;
    letter-spacing: .02em;
  }

  .field input,
  .field select,
  .field textarea {
    width: 100%;
    border: 1px solid rgba(15,23,42,.09);
    background: rgba(248,251,255,.98);
    border-radius: 12px;
    padding: .7rem .8rem;
    font: inherit;
    color: var(--text, #112033);
  }

  .field textarea {
    min-height: 120px;
    resize: vertical;
  }

  .field small {
    color: var(--muted, #607089);
    font-size: .76rem;
    line-height: 1.4;
  }

  .validation {
    display: grid;
    gap: .35rem;
    padding: .75rem .85rem;
    border-radius: 14px;
    background: rgba(11,123,220,.05);
    border: 1px solid rgba(11,123,220,.12);
  }

  .validation.error {
    background: rgba(244,63,94,.06);
    border-color: rgba(244,63,94,.14);
  }

  .validation strong {
    font-size: .83rem;
  }

  .validation ul {
    margin: 0;
    padding-left: 1rem;
    color: var(--muted, #607089);
    font-size: .8rem;
    line-height: 1.5;
  }

  .preview-panel {
    display: grid;
    gap: .85rem;
    padding: 1rem;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(9,37,84,.98), rgba(14,26,55,.98));
    color: #eef4ff;
    border: 1px solid rgba(148,163,184,.18);
    box-shadow: 0 18px 32px rgba(15,23,42,.15);
  }

  .preview-panel .eyebrow {
    font-size: .72rem;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: rgba(191,219,254,.9);
  }

  .preview-panel h5 {
    margin: 0;
    font-size: 1.02rem;
    letter-spacing: -.02em;
  }

  .preview-panel p {
    margin: 0;
    color: rgba(226,232,240,.88);
    line-height: 1.6;
    font-size: .88rem;
  }

  .preview-card {
    display: grid;
    gap: .65rem;
    padding: .9rem;
    border-radius: 16px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.08);
  }

  .preview-meta {
    display: flex;
    gap: .45rem;
    flex-wrap: wrap;
  }

  .preview-chip {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    padding: .34rem .55rem;
    border-radius: 999px;
    font-size: .72rem;
    font-weight: 700;
    background: rgba(59,130,246,.16);
    border: 1px solid rgba(96,165,250,.2);
    color: #dbeafe;
  }

  .preview-list {
    margin: 0;
    padding-left: 1rem;
    color: rgba(226,232,240,.9);
    font-size: .86rem;
    line-height: 1.55;
  }

  .preview-asset {
    display: grid;
    gap: .25rem;
  }

  .preview-asset strong {
    font-size: .82rem;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: rgba(191,219,254,.9);
  }

  .preview-asset span {
    font-weight: 600;
  }

  @media (max-width: 920px) {
    .builder-head,
    .node-head,
    .asset-grid {
      grid-template-columns: 1fr;
      flex-direction: column;
    }

    .node-actions {
      justify-content: flex-start;
      min-width: 0;
    }

    .children {
      margin-left: .6rem;
      padding-left: .85rem;
    }

    .builder-body {
      grid-template-columns: 1fr;
    }

    .details-panel {
      position: static;
    }
  }
`;

function renderNode(node, pathParts, selectedId, depthLimit, draggingNodeId, dropTarget) {
  const pathLabel = getNodePathLabel(pathParts);
  const hasChildren = Boolean(node.children && node.children.length);
  const currentDepth = node.depth || pathParts.length;
  const disableAdd = currentDepth >= depthLimit;
  const asset = node.asset || { type: 'none', fileName: '', url: '' };

  return `
    <article class="node ${node.id === selectedId ? 'selected' : ''} ${draggingNodeId === node.id ? 'dragging' : ''}" draggable="true" data-node-id="${node.id}" data-path="${pathLabel}">
      <div class="node-head ${dropTarget?.zone === 'after' && dropTarget?.nodeId === node.id ? 'drop-active' : ''}" data-drop-zone="after" data-node-id="${node.id}">
        <div style="flex: 1; min-width: 0;">
          <div class="node-label">
            <span class="drag-handle" aria-hidden="true">⋮⋮</span>
            <span class="node-path">${pathLabel}</span>
            <span class="node-depth">ชั้น ${currentDepth}</span>
            <span class="pill subtle">${hasChildren ? `${node.children.length} บทเรียนย่อย` : 'ใบไม้ปลายทาง'}</span>
          </div>
          <input
            class="node-title"
            data-action="title"
            data-node-id="${node.id}"
            data-depth="${currentDepth}"
            value="${escapeHtml(node.title)}"
            aria-label="ชื่อบทเรียน ${pathLabel}"
          />
        </div>
        <div class="node-actions">
          <button class="button" type="button" data-action="select" data-node-id="${node.id}">เลือก</button>
          <button class="button" type="button" data-action="duplicate" data-node-id="${node.id}">ทำสำเนา</button>
          <button class="button" type="button" data-action="move-up" data-node-id="${node.id}">↑</button>
          <button class="button" type="button" data-action="move-down" data-node-id="${node.id}">↓</button>
          <button class="button" type="button" data-action="add-child" data-node-id="${node.id}" ${disableAdd ? 'disabled' : ''}>+ บทเรียนย่อย</button>
          <button class="button danger" type="button" data-action="delete" data-node-id="${node.id}">ลบ</button>
        </div>
      </div>

      <div class="node-body">
        <div class="asset-grid">
          <div class="asset-box">
            <header>
              <span>อัปโหลด PDF</span>
              <span class="asset-label">อัปโหลดไปยัง server อัตโนมัติ</span>
            </header>
            <input class="asset-input" type="file" accept=".pdf,application/pdf" data-action="asset-file" data-node-id="${node.id}" />
            <div class="asset-meta">
              <span class="asset-file">${asset.type === 'pdf' ? escapeHtml(asset.fileName || 'แนบ PDF แล้ว') : 'ยังไม่มี PDF แนบ'}</span>
              <button class="button" type="button" data-action="clear-asset" data-node-id="${node.id}">ล้าง</button>
            </div>
          </div>

          <div class="asset-box">
            <header>
              <span>ลิงก์ภายนอก</span>
              <span class="asset-label">บันทึกพร้อมฉบับร่าง</span>
            </header>
            <input
              class="url-input"
              type="url"
              placeholder="https://example.com/lesson-material"
              value="${escapeHtml(asset.type === 'url' ? asset.url || '' : '')}"
              data-action="asset-url"
              data-node-id="${node.id}"
            />
            <div class="asset-meta">
              <span class="asset-file">${asset.type === 'url' ? escapeHtml(asset.url || 'แนบลิงก์แล้ว') : 'ยังไม่มีลิงก์แนบ'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="children ${draggingNodeId ? 'droppable' : ''} ${dropTarget?.zone === 'inside' && dropTarget?.nodeId === node.id ? 'drop-active' : ''}" data-drop-zone="inside" data-node-id="${node.id}">
        ${hasChildren ? node.children.map((child, index) => renderNode(child, [...pathParts, index + 1], selectedId, depthLimit, draggingNodeId, dropTarget)).join('') : '<div class="empty">ยังไม่มีบทเรียนย่อย เพิ่มบทเรียนย่อยเพื่อขยายโครงสร้าง</div>'}
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getStorageKey(courseId) {
  return courseId ? `${COURSE_BUILDER_STORAGE_KEY}:${courseId}` : COURSE_BUILDER_STORAGE_KEY;
}

function remoteNodeToLocal(node) {
  const asset = node.asset || {};
  return {
    id: node.id,
    title: node.title,
    depth: Math.max(1, Number(node.depth || 1)),
    nodeType: node.nodeType || 'lesson',
    estimatedMinutes: Number(node.estimatedMinutes || 0),
    contentType: node.contentType || 'article',
    description: node.description || '',
    plainText: node.plainText || '',
    htmlContent: node.htmlContent || '',
    transcriptSegments: Array.isArray(node.transcriptSegments) ? node.transcriptSegments.map((segment) => ({ ...segment })) : [],
    transcriptLanguage: node.transcriptLanguage || 'th',
    transcriptStatus: node.transcriptStatus || 'ready',
    transcriptFullText: node.transcriptFullText || '',
    asset: asset?.type && asset.type !== 'none'
      ? {
          type: asset.type === 'pdf' ? 'pdf' : 'url',
          fileName: asset.fileName || asset.title || '',
          url: asset.url || asset.fileUrl || asset.externalUrl || '',
          fileUrl: asset.fileUrl || '',
          externalUrl: asset.externalUrl || '',
          mimeType: asset.mimeType || '',
          size: asset.sizeBytes || 0,
        }
      : { type: 'none', fileName: '', url: '' },
    children: Array.isArray(node.children) ? node.children.map(remoteNodeToLocal) : [],
  };
}

function moduleToLocalNode(module) {
  return createLessonNode({
    title: module.title || 'New lesson',
    depth: 1,
    asset: module.videoUrl
      ? {
          type: 'url',
          fileName: '',
          url: module.videoUrl,
        }
      : undefined,
  });
}

function findNodeTrail(nodes, nodeId, trail = []) {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const nextTrail = [...trail, index + 1];
    if (node.id === nodeId) {
      return {
        node,
        trail: nextTrail,
      };
    }

    const child = findNodeTrail(node.children || [], nodeId, nextTrail);
    if (child) {
      return child;
    }
  }

  return null;
}

function makePreviewLines(node) {
  const transcriptSegments = Array.isArray(node?.transcriptSegments) ? node.transcriptSegments : [];
  if (transcriptSegments.length) {
    return transcriptSegments.slice(0, 3).map((segment) => `${segment.seek || '00:00'} • ${segment.text || ''}`.trim());
  }

  const raw = String(node?.plainText || node?.description || node?.htmlContent || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) {
    return ['ยังไม่มีเนื้อหาบทเรียน', 'เพิ่มโน้ตหรือข้อความล้วนเพื่อดูตัวอย่างประสบการณ์การเรียน'];
  }

  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  return sentences.length ? sentences : [raw.slice(0, 140)];
}

function formatTranscriptSegment(segment) {
  const seek = String(segment?.seek || '00:00').trim();
  const text = String(segment?.text || '').trim();
  return `${seek} | ${text}`;
}

function parseTranscriptLines(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [seekPart, ...textParts] = line.split('|');
      const seek = (seekPart || '').trim() || `${String(Math.floor(index / 6)).padStart(2, '0')}:${String((index % 6) * 10).padStart(2, '0')}`;
      const segmentText = textParts.join('|').trim();
      return {
        seek,
        progress: Math.min(100, Math.max(0, Math.round((index + 1) * 100 / Math.max(1, text.split('\n').filter(Boolean).length)))),
        text: segmentText || `บรรทัดทรานสคริปต์ ${index + 1}`,
      };
    });
}

function serializeTranscriptSegments(segments) {
  return (Array.isArray(segments) ? segments : []).map(formatTranscriptSegment).join('\n');
}

function makeAssetPreview(node) {
  const asset = node?.asset || {};
  if (asset.type === 'pdf') {
    return {
      label: 'ไฟล์ PDF',
      value: asset.fileName || 'แนบ PDF แล้ว',
      hint: asset.fileUrl || asset.url || 'จะอัปโหลดไปยัง server',
    };
  }

  if (asset.type === 'url') {
    return {
      label: 'ลิงก์ภายนอก',
      value: asset.url || asset.externalUrl || 'ยังไม่มีลิงก์',
      hint: 'บันทึกพร้อมฉบับร่าง',
    };
  }

  return {
    label: 'ไฟล์แนบ',
    value: 'ยังไม่มีไฟล์แนบ',
    hint: 'แนบ PDF หรือ URL เพื่อให้บทเรียนพร้อมใช้งาน',
  };
}

class CourseBuilderEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.state = createDemoCourseBuilderState();
    this.selectedNodeId = this.state.nodes[0]?.id || null;
    this.course = {
      id: null,
      remoteCourseId: null,
      title: this.state.courseTitle,
      status: this.state.courseStatus,
      description: '',
      modules: [],
    };
    this.storageKey = getStorageKey(null);
    this.syncStatus = 'local';
    this.isDirty = false;
    this.isSaving = false;
    this.hydrationToken = 0;
    this.draggingNodeId = null;
    this.dropTarget = null;
    this.autoSaveTimer = null;
    this.lastSavedAt = null;
  }

  connectedCallback() {
    this.restore();
    this.render();
    this.bind();
  }

  setCourse(course) {
    if (!course) return;
    this.course = {
      ...this.course,
      id: course.id ?? this.course.id,
      remoteCourseId: course.remoteCourseId ?? this.course.remoteCourseId ?? null,
      title: course.title || this.course.title,
      status: course.status || this.course.status,
      description: course.description || '',
      modules: Array.isArray(course.modules) ? course.modules : [],
    };
    this.storageKey = getStorageKey(this.course.id);
    const persisted = this.readPersisted();
    if (persisted?.nodes?.length) {
      this.restore(true);
    } else if (this.course.modules.length) {
      this.state.nodes = this.course.modules.map(moduleToLocalNode);
      this.selectedNodeId = this.state.nodes[0]?.id || null;
    }
    this.render();
    void this.hydrateCourse();
  }

  getData() {
    return {
      course: { ...this.course },
      nodes: cloneTree(this.state.nodes),
    };
  }

  getSelectedNode() {
    return findNodeById(this.state.nodes, this.selectedNodeId);
  }

  getSelectedNodeTrail() {
    return findNodeTrail(this.state.nodes, this.selectedNodeId);
  }

  patchSelectedNode(mutate) {
    if (!this.selectedNodeId) return;
    this.updateNode(this.selectedNodeId, mutate);
  }

  getTranscriptEditorValue(node) {
    if (!node) return '';
    if (Array.isArray(node.transcriptSegments) && node.transcriptSegments.length) {
      return serializeTranscriptSegments(node.transcriptSegments);
    }

    const fallback = String(node.plainText || node.description || node.htmlContent || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!fallback) return '';

    return fallback
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .map((line, index) => `${String(Math.floor(index / 6)).padStart(2, '0')}:${String((index % 6) * 10).padStart(2, '0')} | ${line}`)
      .join('\n');
  }

  markDirty() {
    this.isDirty = true;
    if (this.syncStatus === 'synced') {
      this.syncStatus = 'local';
    }
  }

  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      window.clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    const session = window.CourseChic?.getSession?.();
    if (!session?.nestToken) {
      return;
    }

    this.autoSaveTimer = window.setTimeout(() => {
      this.autoSaveTimer = null;
      void this.save().catch(() => {});
    }, 1200);
  }

  async hydrateCourse() {
    const token = ++this.hydrationToken;
    const session = window.CourseChic?.getSession?.();
    const remoteCourseId = this.course.remoteCourseId;
    const stored = this.readPersisted();

    if (stored?.nodes?.length && token === this.hydrationToken) {
      this.state.nodes = stored.nodes;
      this.selectedNodeId = stored.selectedNodeId || this.selectedNodeId;
      this.course = {
        ...this.course,
        ...stored.course,
        id: this.course.id ?? stored.course?.id ?? null,
        remoteCourseId: stored.course?.remoteCourseId ?? remoteCourseId ?? null,
      };
      this.syncStatus = stored.course?.remoteCourseId ? 'synced' : 'local';
      this.isDirty = false;
      this.render();
      return;
    }

    if (!session?.nestToken) {
      if ((!this.state.nodes || !this.state.nodes.length) && this.course.modules.length) {
        this.state.nodes = this.course.modules.map(moduleToLocalNode);
        this.selectedNodeId = this.state.nodes[0]?.id || null;
      }
      this.syncStatus = 'local';
      this.isDirty = false;
      this.persist();
      this.render();
      return;
    }

    if (remoteCourseId) {
      try {
        const response = await window.CourseChic.requestNest(`/courses/${remoteCourseId}/tree`);
        if (token !== this.hydrationToken) return;
        const remoteNodes = response?.data?.nodes || [];
        if (remoteNodes.length) {
          this.state.nodes = remoteNodes.map(remoteNodeToLocal);
          this.selectedNodeId = this.state.nodes[0]?.id || null;
          this.syncStatus = 'synced';
          this.isDirty = false;
          this.persist();
          this.render();
          return;
        }
      } catch (error) {
        console.warn('โหลดต้นไม้บทเรียนจากเซิร์ฟเวอร์ไม่สำเร็จ:', error);
      }
    }

    if (!this.state.nodes || !this.state.nodes.length) {
      if (this.course.modules.length) {
        this.state.nodes = this.course.modules.map(moduleToLocalNode);
      } else {
        this.state.nodes = createDemoCourseBuilderState().nodes;
      }
      this.selectedNodeId = this.state.nodes[0]?.id || null;
    }

    this.syncStatus = remoteCourseId ? 'synced' : 'local';
    this.isDirty = false;
    this.persist();
    this.render();
  }

  bind() {
    const root = this.shadowRoot;
    root.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      const nodeId = button.dataset.nodeId;

      if (action === 'select') {
        this.selectedNodeId = nodeId;
        this.render();
        return;
      }

      if (action === 'add-child') {
        this.addChild(nodeId);
        return;
      }

      if (action === 'delete') {
        this.deleteNode(nodeId);
        return;
      }

      if (action === 'duplicate') {
        this.duplicateNode(nodeId);
        return;
      }

      if (action === 'move-up') {
        this.moveSibling(nodeId, -1);
        return;
      }

      if (action === 'move-down') {
        this.moveSibling(nodeId, 1);
        return;
      }

      if (action === 'clear-asset') {
        this.clearAsset(nodeId);
        return;
      }

      if (action === 'add-root') {
        this.addRoot();
        return;
      }

      if (action === 'save') {
        void this.save();
        return;
      }

      if (action === 'reset') {
        this.resetDemo();
        return;
      }

      if (action === 'open-preview') {
        void this.openStudentPreview();
        return;
      }

      if (action === 'generate-transcript') {
        this.generateTranscriptFromPlainText(this.selectedNodeId);
        return;
      }
    });

    root.addEventListener('change', (event) => {
      const input = event.target.closest('[data-action="title"], [data-action="asset-url"], [data-action="asset-file"], [data-action="node-type"], [data-action="estimated-minutes"], [data-action="content-type"], [data-action="description"], [data-action="plain-text"], [data-action="html-content"], [data-action="transcript-lines"]');
      if (!input) return;
      const nodeId = input.dataset.nodeId;

      if (input.dataset.action === 'title') {
        this.updateNode(nodeId, (node) => {
          node.title = input.value;
        });
      }

      if (input.dataset.action === 'asset-url') {
        this.updateNode(nodeId, (node) => {
          const current = node.asset || { type: 'none', fileName: '', url: '' };
          node.asset = {
            type: input.value ? 'url' : 'none',
            url: input.value,
            fileName: '',
          };
          if (!input.value && current.type === 'pdf') {
            node.asset = { type: 'none', fileName: '', url: '' };
          }
        });
      }

      if (input.dataset.action === 'asset-file') {
        const file = input.files?.[0];
        if (!file) return;
        void this.uploadPdf(nodeId, file)
          .catch(() => {})
          .finally(() => {
          input.value = '';
          });
      }

      if (input.dataset.action === 'node-type') {
        this.updateNode(nodeId, (node) => {
          node.nodeType = input.value;
        });
      }

      if (input.dataset.action === 'estimated-minutes') {
        this.updateNode(nodeId, (node) => {
          node.estimatedMinutes = Math.max(0, Number(input.value || 0));
        });
      }

      if (input.dataset.action === 'content-type') {
        this.updateNode(nodeId, (node) => {
          node.contentType = input.value;
        });
      }

      if (input.dataset.action === 'description') {
        this.updateNode(nodeId, (node) => {
          node.description = input.value;
        });
      }

      if (input.dataset.action === 'plain-text') {
        this.updateNode(nodeId, (node) => {
          node.plainText = input.value;
        });
      }

      if (input.dataset.action === 'html-content') {
        this.updateNode(nodeId, (node) => {
          node.htmlContent = input.value;
        });
      }

      if (input.dataset.action === 'transcript-lines') {
        this.updateNode(nodeId, (node) => {
          node.transcriptSegments = parseTranscriptLines(input.value);
          node.plainText = (node.transcriptSegments || []).map((segment) => segment.text).join(' ');
          node.transcriptFullText = (node.transcriptSegments || []).map((segment) => segment.text).join(' ').trim();
        });
      }
    });

    root.addEventListener('submit', (event) => {
      const form = event.target.closest('form[data-role="builder-form"]');
      if (!form) return;
      event.preventDefault();
    });

    root.addEventListener('dragstart', (event) => {
      const node = event.target.closest('.node[data-node-id]');
      if (!node) return;
      this.draggingNodeId = node.dataset.nodeId;
      event.dataTransfer?.setData('text/plain', this.draggingNodeId);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
      }
      this.render();
    });

    root.addEventListener('dragend', () => {
      this.draggingNodeId = null;
      this.dropTarget = null;
      this.render();
    });

    root.addEventListener('dragover', (event) => {
      const node = event.target.closest('[data-drop-zone]');
      if (!node || !this.draggingNodeId) return;
      event.preventDefault();
      event.dataTransfer && (event.dataTransfer.dropEffect = 'move');
      const nextTarget = {
        zone: node.dataset.dropZone,
        nodeId: node.dataset.nodeId || null,
      };
      const hasChanged =
        this.dropTarget?.zone !== nextTarget.zone || this.dropTarget?.nodeId !== nextTarget.nodeId;
      this.dropTarget = nextTarget;
      if (hasChanged) {
        this.render();
      }
    });

    root.addEventListener('drop', (event) => {
      const zone = event.target.closest('[data-drop-zone]');
      if (!zone || !this.draggingNodeId) return;
      event.preventDefault();

      const targetNodeId = zone.dataset.nodeId || null;
      const targetZone = zone.dataset.dropZone;
      if (targetZone === 'inside' && targetNodeId) {
        this.moveNode(this.draggingNodeId, targetNodeId, 'inside');
      } else if (targetZone === 'root') {
        this.moveNodeToRoot(this.draggingNodeId);
      } else if (targetNodeId) {
        this.moveNode(this.draggingNodeId, targetNodeId, 'after');
      }

      this.draggingNodeId = null;
      this.dropTarget = null;
      this.persist();
      this.render();
    });
  }

  readPersisted() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  updateNode(nodeId, mutate) {
    const next = cloneTree(this.state.nodes);
    const node = findNodeById(next, nodeId);
    if (!node) return;
    mutate(node);
    this.state.nodes = normalizeTreeDepths(next);
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  moveNode(sourceId, targetId, position) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const next = moveNodeInTree(this.state.nodes, sourceId, targetId, position);
    const normalized = normalizeTreeDepths(next);
    if (maxDepth(normalized) > COURSE_BUILDER_MAX_DEPTH) {
      return;
    }
    this.state.nodes = normalized;
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  moveNodeToRoot(sourceId) {
    if (!sourceId) return;
    const next = moveNodeToRoot(this.state.nodes, sourceId);
    const normalized = normalizeTreeDepths(next);
    if (maxDepth(normalized) > COURSE_BUILDER_MAX_DEPTH) {
      return;
    }
    this.state.nodes = normalized;
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  async uploadPdf(nodeId, file) {
    const session = window.CourseChic?.getSession?.();
    if (!session?.token) {
      this.updateNode(nodeId, (node) => {
        node.asset = {
          type: 'pdf',
          fileName: file.name,
          url: '',
          size: file.size,
        };
      });
      return;
    }

    this.syncStatus = 'uploading';
    this.render();

    const formData = new FormData();
    formData.append('file', file);

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${session.token}`);
    if (session.tenantSlug) {
      headers.set('x-tenant-slug', session.tenantSlug);
    }

    try {
      const response = await fetch('/api/course-builder/upload-pdf', {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'อัปโหลด PDF ไม่สำเร็จ');
      }

      this.updateNode(nodeId, (node) => {
        node.asset = {
          type: 'pdf',
          fileName: data.fileName || file.name,
          url: data.fileUrl || '',
          fileUrl: data.fileUrl || '',
          mimeType: data.mimeType || file.type,
          size: data.sizeBytes || file.size,
        };
      });
      this.markDirty();
      this.persist();
      this.render();
      this.scheduleAutoSave();
    } catch (error) {
      console.error('อัปโหลด PDF ไม่สำเร็จ:', error);
      this.syncStatus = 'error';
      this.render();
      throw error;
    }
  }

  addChild(nodeId) {
    const next = cloneTree(this.state.nodes);
    const parent = findNodeById(next, nodeId);
    if (!parent) return;
    const currentDepth = parent.depth || 1;
    if (currentDepth >= COURSE_BUILDER_MAX_DEPTH) {
      return;
    }

    parent.children = parent.children || [];
    parent.children.push(
      createLessonNode({
        title: 'บทเรียนย่อยใหม่',
        depth: currentDepth + 1,
      }),
    );
    this.state.nodes = next;
    this.selectedNodeId = parent.children[parent.children.length - 1].id;
    this.state.nodes = normalizeTreeDepths(this.state.nodes);
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  deleteNode(nodeId) {
    const next = removeNodeById(this.state.nodes, nodeId);
    this.state.nodes = next.length ? normalizeTreeDepths(next) : [createLessonNode({ title: 'New lesson', depth: 1 })];
    this.selectedNodeId = this.state.nodes[0]?.id || null;
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  duplicateNode(nodeId) {
    const result = duplicateNodeById(this.state.nodes, nodeId);
    this.state.nodes = normalizeTreeDepths(result.nodes || this.state.nodes);
    this.selectedNodeId = result.duplicatedId || this.selectedNodeId;
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  moveSibling(nodeId, delta) {
    const next = moveNodeSibling(this.state.nodes, nodeId, delta);
    this.state.nodes = normalizeTreeDepths(next);
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  generateTranscriptFromPlainText(nodeId) {
    this.updateNode(nodeId, (node) => {
      const raw = String(node.plainText || node.description || node.htmlContent || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!raw) {
        node.transcriptSegments = [];
        return;
      }

      const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 8);
      node.transcriptSegments = sentences.map((sentence, index) => ({
        seek: `${String(Math.floor(index / 6)).padStart(2, '0')}:${String((index % 6) * 10).padStart(2, '0')}`,
        progress: Math.min(100, Math.max(0, Math.round(((index + 1) / Math.max(sentences.length, 1)) * 100))),
        text: sentence,
      }));
      node.transcriptFullText = node.transcriptSegments.map((segment) => segment.text).join(' ').trim();
    });
  }

  async openStudentPreview() {
    const selectedNodeTrail = this.getSelectedNodeTrail();
    const selectedNode = selectedNodeTrail?.node || this.getSelectedNode();
    if (!selectedNode) return;

    const preview = {
      lesson: {
        ...selectedNode,
        trail: selectedNodeTrail?.trail || [],
        path: selectedNodeTrail?.trail?.join('.') || '',
      },
      course: {
        title: this.course.title || this.state.courseTitle,
        slug: slugify(this.course.title || this.state.courseTitle) || 'course-preview',
        nodes: cloneTree(this.state.nodes),
      },
    };

    if (window.CourseChic?.setLessonPreview) {
      window.CourseChic.setLessonPreview(preview);
    } else {
      localStorage.setItem('coursechic.courseBuilder.lessonPreview', JSON.stringify(preview));
    }

    const previewUrl = new URL('/student-app.html?preview=1', window.location.origin);
    window.open(previewUrl.toString(), '_blank', 'noopener,noreferrer');
  }

  clearAsset(nodeId) {
    this.updateNode(nodeId, (node) => {
      node.asset = { type: 'none', fileName: '', url: '' };
    });
  }

  addRoot() {
    const next = cloneTree(this.state.nodes);
    next.push(createLessonNode({ title: 'New lesson', depth: 1 }));
    this.state.nodes = normalizeTreeDepths(next);
    this.selectedNodeId = next[next.length - 1].id;
    this.markDirty();
    this.persist();
    this.render();
    this.scheduleAutoSave();
  }

  persist() {
    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          course: this.course,
          nodes: this.state.nodes,
          selectedNodeId: this.selectedNodeId,
        }),
      );
    } catch {
      // ignore storage quota issues and keep working in-memory
    }
  }

  restore(silent = false) {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.nodes?.length) {
        this.state.nodes = parsed.nodes;
      }
      if (parsed?.course) {
        this.course = parsed.course;
      }
      this.selectedNodeId = parsed?.selectedNodeId || this.selectedNodeId;
    } catch {
      // ignore corrupted storage and fall back to seed
    }
  }

  async save() {
    if (this.isSaving) return;
    this.isSaving = true;
    this.syncStatus = 'saving';
    this.render();
    let syncResult = { mode: 'local' };
    let syncError = null;

    try {
      this.persist();
      syncResult = await this.syncToBackend();
      this.syncStatus = syncResult?.mode === 'remote' ? 'synced' : 'local';
      this.isDirty = false;
      this.lastSavedAt = new Date().toISOString();
    } catch (error) {
      console.error('บันทึก course builder ไม่สำเร็จ:', error);
      this.syncStatus = 'error';
      syncError = error;
    } finally {
      this.dispatchEvent(
        new CustomEvent('course-builder:save', {
          bubbles: true,
          composed: true,
          detail: {
            ...this.getData(),
            sync: syncResult,
            error: syncError ? String(syncError?.message || syncError) : null,
          },
        }),
      );
      this.isSaving = false;
      this.render();
    }

    return syncResult;
  }

  validateTree() {
    const issues = [];
    if (!this.state.nodes.length) {
      issues.push({ type: 'error', text: 'ไม่มีบทเรียนในคอร์ส' });
    }

    const walk = (nodes) => {
      for (const node of nodes) {
        if (!String(node.title || '').trim()) {
          issues.push({ type: 'error', text: 'มีบทย่อยที่ยังไม่มีชื่อ' });
        }
        if (String(node.title || '').trim().length > 120) {
          issues.push({ type: 'warning', text: `ชื่อ "${node.title.slice(0, 24)}..." ยาวเกินไป` });
        }
        if ((node.estimatedMinutes || 0) < 0) {
          issues.push({ type: 'error', text: `เวลาประมาณของ "${node.title}" ไม่ถูกต้อง` });
        }
        if ((node.depth || 1) > COURSE_BUILDER_MAX_DEPTH) {
          issues.push({ type: 'error', text: `Depth ของ "${node.title}" เกิน ${COURSE_BUILDER_MAX_DEPTH}` });
        }
        walk(node.children || []);
      }
    };

    walk(this.state.nodes);

    return issues;
  }

  async publishCourse() {
    const issues = this.validateTree().filter((issue) => issue.type === 'error');
    if (issues.length) {
      throw new Error(issues[0].text || 'การตรวจสอบไม่ผ่าน');
    }

    const syncResult = await this.save();
    const session = window.CourseChic?.getSession?.();
    if (!session?.nestToken) {
      return syncResult;
    }

    if (!this.course.remoteCourseId) {
      await this.ensureRemoteCourse();
    }

    const remoteCourseId = this.course.remoteCourseId;
    if (!remoteCourseId) {
      return syncResult;
    }

    await window.CourseChic.requestNest(`/courses/${remoteCourseId}/publish`, {
      method: 'POST',
    });

    this.course.status = 'published';
    this.persist();
    this.syncStatus = 'synced';
    this.isDirty = false;
    this.lastSavedAt = new Date().toISOString();
    this.render();
    this.dispatchEvent(
      new CustomEvent('course-builder:publish', {
        bubbles: true,
        composed: true,
        detail: {
          courseId: remoteCourseId,
          title: this.course.title,
        },
      }),
    );

    return syncResult;
  }

  resetDemo() {
    const seed = createDemoCourseBuilderState();
    this.state = {
      courseTitle: seed.courseTitle,
      courseStatus: seed.courseStatus,
      nodes: seed.nodes,
    };
    this.course = {
      ...this.course,
      remoteCourseId: null,
      title: seed.courseTitle,
      status: seed.courseStatus,
      description: '',
      modules: [],
    };
    this.selectedNodeId = seed.nodes[0]?.id || null;
    this.storageKey = getStorageKey(this.course.id);
    this.syncStatus = 'local';
    this.isDirty = false;
    this.lastSavedAt = null;
    this.persist();
    this.render();
  }

  async ensureRemoteCourse() {
    const session = window.CourseChic?.getSession?.();
    if (!session?.nestToken) {
      return null;
    }

    if (this.course.remoteCourseId) {
      return this.course.remoteCourseId;
    }

    const title = this.course.title || this.state.courseTitle;
    const payload = {
      title,
      slug: slugify(title) || 'course-builder',
      description: this.course.description || '',
      subject: '',
      level: '',
    };

    const response = await window.CourseChic.requestNest('/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const remoteCourseId = response?.data?.id ?? response?.id ?? null;
    this.course.remoteCourseId = remoteCourseId;
    this.persist();
    return remoteCourseId;
  }

  getNodeType(node) {
    return node.nodeType || (node.depth <= 1 ? 'section' : 'lesson');
  }

  extractRemoteAsset(node) {
    const asset = node.asset || {};
    if (asset.type === 'pdf' || asset.fileUrl) {
      return {
        assetType: 'pdf',
        title: asset.fileName || node.title,
        fileUrl: asset.fileUrl || asset.url || '',
        mimeType: asset.mimeType || 'application/pdf',
        sizeBytes: asset.size || asset.sizeBytes || null,
      };
    }

    if (asset.type === 'url' && (asset.url || asset.externalUrl)) {
      return {
        assetType: 'link',
        title: asset.fileName || node.title,
        externalUrl: asset.externalUrl || asset.url || '',
        mimeType: null,
        sizeBytes: null,
      };
    }

    return null;
  }

  async syncToBackend() {
    const session = window.CourseChic?.getSession?.();
    if (!session?.nestToken) {
      return { mode: 'local' };
    }

    const remoteCourseId = await this.ensureRemoteCourse();
    if (!remoteCourseId) {
      return { mode: 'local' };
    }

    await window.CourseChic.requestNest(`/courses/${remoteCourseId}/tree`, {
      method: 'DELETE',
    });

    const createTree = async (nodes, parentId = null) => {
      for (const node of nodes) {
        const created = await window.CourseChic.requestNest(`/courses/${remoteCourseId}/nodes`, {
          method: 'POST',
          body: JSON.stringify({
            parentId,
            nodeType: this.getNodeType(node),
            title: node.title,
            estimatedMinutes: Number(node.estimatedMinutes || 0),
          }),
        });

        const remoteNodeId = created?.data?.id ?? created?.id;
        if (node.description || node.plainText || node.htmlContent || node.contentType) {
          await window.CourseChic.requestNest(`/lesson-nodes/${remoteNodeId}/content`, {
            method: 'PUT',
            body: JSON.stringify({
              contentType: node.contentType || 'article',
              htmlContent: node.htmlContent || '',
              plainText: node.plainText || node.description || '',
            }),
          });
        }

        const transcriptSegments = Array.isArray(node.transcriptSegments)
          ? node.transcriptSegments
              .map((segment) => ({
                seek: String(segment?.seek || '').trim(),
                progress: Math.max(0, Math.min(100, Number(segment?.progress || 0))),
                text: String(segment?.text || '').trim(),
              }))
              .filter((segment) => segment.seek && segment.text)
          : [];

        if (transcriptSegments.length) {
          await window.CourseChic.requestNest(`/lesson-nodes/${remoteNodeId}/transcript`, {
            method: 'PUT',
            body: JSON.stringify({
              language: node.transcriptLanguage || 'th',
              status: node.transcriptStatus || 'ready',
              fullText: node.transcriptFullText || transcriptSegments.map((segment) => segment.text).join(' '),
              segments: transcriptSegments,
            }),
          });
        }

        const asset = this.extractRemoteAsset(node);
        if (asset) {
          await window.CourseChic.requestNest(`/lesson-nodes/${remoteNodeId}/assets`, {
            method: 'POST',
            body: JSON.stringify(asset),
          });
        }

        if (node.children?.length) {
          await createTree(node.children, remoteNodeId);
        }
      }
    };

    await createTree(this.state.nodes);
    this.course.remoteCourseId = remoteCourseId;
    this.persist();
    return {
      mode: 'remote',
      remoteCourseId,
      nodeCount: countNodes(this.state.nodes),
    };
  }

  render() {
    const nodeCount = countNodes(this.state.nodes);
    const assetCount = countAssetNodes(this.state.nodes);
    const depthReached = maxDepth(this.state.nodes);
    const courseTitle = this.course.title || this.state.courseTitle;
    const courseStatus = this.course.status || this.state.courseStatus;
    const selectedNodeTrail = this.getSelectedNodeTrail();
    const selectedNode = selectedNodeTrail?.node || this.getSelectedNode();
    const selectedPath = selectedNodeTrail?.trail?.join('.') || '';
    const validationIssues = this.validateTree();
    const previewLines = makePreviewLines(selectedNode);
    const previewAsset = makeAssetPreview(selectedNode);
    const syncLabel =
      this.syncStatus === 'saving'
        ? 'กำลังบันทึก...'
        : this.syncStatus === 'uploading'
          ? 'กำลังอัปโหลด PDF...'
          : this.syncStatus === 'error'
            ? 'บันทึกไม่สำเร็จ'
          : this.syncStatus === 'synced'
            ? 'ซิงก์กับ backend แล้ว'
            : 'ฉบับร่างในเครื่อง';
    const dirtyLabel = this.isDirty ? 'ยังไม่ได้บันทึก' : this.lastSavedAt ? `บันทึกแล้ว ${new Date(this.lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'ยังไม่มีการแก้ไข';

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="builder" data-role="builder-form">
        <div class="builder-head">
          <div class="title-block">
            <div class="meta">
              <span class="pill">${escapeHtml(courseStatus)}</span>
              <span class="pill subtle">ลึกสุด ${COURSE_BUILDER_MAX_DEPTH} ชั้น</span>
              <span class="pill subtle">${escapeHtml(syncLabel)}</span>
              <span class="pill subtle">${escapeHtml(dirtyLabel)}</span>
            </div>
            <h3>${escapeHtml(courseTitle)}</h3>
            <p>แก้โครงสร้างบทเรียนแบบ Nested, ใส่ PDF หรือ external URL ได้ในทุกบทย่อย</p>
          </div>
          <div class="toolbar">
            <button class="button primary" type="button" data-action="add-root">+ เพิ่มบทเรียนหลัก</button>
            <button class="button" type="button" data-action="open-preview" ${selectedNode ? '' : 'disabled'}>Open Student Preview</button>
            <button class="button" type="button" data-action="save">บันทึกฉบับร่าง</button>
            <button class="button" type="button" data-action="reset">รีเซ็ตเดโม</button>
          </div>
        </div>

        <div class="summary">
          <span class="pill subtle">${nodeCount} บทเรียน</span>
          <span class="pill subtle">${assetCount} ไฟล์แนบ</span>
          <span class="pill subtle">ลึกถึง ${depthReached} ชั้น</span>
        </div>

        <div class="builder-body">
          <div class="builder-main">
            <div class="builder-tree ${this.dropTarget?.zone === 'root' ? 'drop-active' : ''} ${this.draggingNodeId ? 'droppable' : ''}" data-drop-zone="root">
              ${this.state.nodes.map((node, index) => renderNode(node, [index + 1], this.selectedNodeId, COURSE_BUILDER_MAX_DEPTH, this.draggingNodeId, this.dropTarget)).join('')}
            </div>
          </div>

          <aside class="details-panel">
            <div class="details-head">
              <h4>${selectedNode ? escapeHtml(selectedNode.title || 'บทเรียนที่เลือก') : 'เลือกบทเรียน'}</h4>
              <p>${selectedNode ? `เส้นทาง ${selectedPath || '-'} • ชั้น ${selectedNode.depth || 1}` : 'คลิกการ์ดบทเรียนเพื่อแก้ metadata, ประเภทเนื้อหา, และความพร้อมก่อนเผยแพร่'}</p>
            </div>

            <div class="details-form">
              <div class="field">
                <label>ชื่อบทเรียน</label>
                <input
                  data-action="title"
                  data-node-id="${selectedNode?.id || ''}"
                  value="${escapeHtml(selectedNode?.title || '')}"
                  placeholder="ใส่ชื่อบทเรียน"
                  ${selectedNode ? '' : 'disabled'}
                />
              </div>

              <div class="field">
                <label>ประเภทโหนด</label>
                <select data-action="node-type" data-node-id="${selectedNode?.id || ''}" ${selectedNode ? '' : 'disabled'}>
                  ${['section', 'lesson', 'quiz', 'assignment'].map((type) => `<option value="${type}" ${selectedNode?.nodeType === type ? 'selected' : ''}>${type}</option>`).join('')}
                </select>
              </div>

              <div class="field">
                <label>เวลาที่คาดไว้ (นาที)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  data-action="estimated-minutes"
                  data-node-id="${selectedNode?.id || ''}"
                  value="${escapeHtml(String(selectedNode?.estimatedMinutes ?? 0))}"
                  ${selectedNode ? '' : 'disabled'}
                />
                <small>ใช้กับแผนเรียนและตารางเรียนของ AI</small>
              </div>

              <div class="field">
                <label>ประเภทเนื้อหา</label>
                <select data-action="content-type" data-node-id="${selectedNode?.id || ''}" ${selectedNode ? '' : 'disabled'}>
                  ${['article', 'video', 'pdf', 'external_link', 'mixed'].map((type) => `<option value="${type}" ${selectedNode?.contentType === type ? 'selected' : ''}>${type}</option>`).join('')}
                </select>
              </div>

              <div class="field">
                <label>คำอธิบาย</label>
                <textarea
                  data-action="description"
                  data-node-id="${selectedNode?.id || ''}"
                  placeholder="โน้ตสั้น ๆ สำหรับบทเรียนนี้"
                  ${selectedNode ? '' : 'disabled'}
                >${escapeHtml(selectedNode?.description || '')}</textarea>
              </div>

              <div class="field">
                <label>เนื้อหาข้อความล้วน</label>
                <textarea
                  data-action="plain-text"
                  data-node-id="${selectedNode?.id || ''}"
                  placeholder="ใช้กับทรานสคริปต์, การค้นคืนของ AI, และโน้ต"
                  ${selectedNode ? '' : 'disabled'}
                >${escapeHtml(selectedNode?.plainText || '')}</textarea>
              </div>

              <div class="field">
                <label>เนื้อหา HTML</label>
                <textarea
                  data-action="html-content"
                  data-node-id="${selectedNode?.id || ''}"
                  placeholder="<p>Lesson body</p>"
                  ${selectedNode ? '' : 'disabled'}
                >${escapeHtml(selectedNode?.htmlContent || '')}</textarea>
                <small>HTML ไม่บังคับ ใช้ข้อความล้วนก็พอสำหรับ AI tutor และการนำเข้าทรานสคริปต์</small>
              </div>

              <div class="field">
                <label>ช่วงทรานสคริปต์</label>
                <textarea
                  data-action="transcript-lines"
                  data-node-id="${selectedNode?.id || ''}"
                  placeholder="00:00 | บทนำ..."
                  ${selectedNode ? '' : 'disabled'}
                >${escapeHtml(this.getTranscriptEditorValue(selectedNode))}</textarea>
                <small>หนึ่งบรรทัดต่อหนึ่งช่วง รูปแบบ <code>mm:ss | text</code> ข้อมูลนี้ใช้กับ preview ฝั่งนักเรียนและการคลิกเพื่อ seek</small>
                <div class="toolbar" style="justify-content: flex-start;">
                  <button class="button" type="button" data-action="generate-transcript" ${selectedNode ? '' : 'disabled'}>สร้างจากเนื้อหา</button>
                </div>
              </div>
            </div>

            <div class="validation ${validationIssues.some((issue) => issue.type === 'error') ? 'error' : ''}">
              <strong>${validationIssues.length ? `${validationIssues.length} ข้อเสนอแนะ` : 'ไม่มีปัญหาการตรวจสอบ'}</strong>
              <ul>
                ${validationIssues.length ? validationIssues.map((issue) => `<li>${escapeHtml(issue.text)}</li>`).join('') : '<li>โครงสร้างพร้อมเผยแพร่</li>'}
              </ul>
            </div>

            <div class="preview-panel">
              <div class="eyebrow">ตัวอย่างสด</div>
              <h5>${selectedNode ? escapeHtml(selectedNode.title || 'บทเรียนที่เลือก') : 'เลือกบทเรียน'}</h5>
              <p>${selectedNode ? escapeHtml(selectedNode.description || 'ตัวอย่างนี้สะท้อนสิ่งที่นักเรียนจะเห็นในหน้าบทเรียน') : 'เลือกโหนดจากต้นไม้เพื่อดูตัวอย่างตรงนี้'}</p>

      <div class="preview-card">
        <div class="preview-meta">
          <span class="preview-chip">${escapeHtml(selectedNode?.nodeType || 'lesson')}</span>
          <span class="preview-chip">${escapeHtml(`~${selectedNode?.estimatedMinutes || 0} min`)}</span>
          <span class="preview-chip">${escapeHtml(selectedNode?.contentType || 'article')}</span>
        </div>
        <div class="preview-asset">
          <strong>${escapeHtml(previewAsset.label)}</strong>
          <span>${escapeHtml(previewAsset.value)}</span>
          <small style="color: rgba(226,232,240,.76);">${escapeHtml(previewAsset.hint)}</small>
        </div>
        <ul class="preview-list">
          ${previewLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
        </ul>
        <div class="toolbar" style="justify-content: flex-start;">
          <button class="button primary" type="button" data-action="open-preview" ${selectedNode ? '' : 'disabled'}>Open Student Preview</button>
        </div>
      </div>
    </div>
          </aside>
        </div>
      </section>
    `;

  }
}

if (!customElements.get('course-builder-editor')) {
  customElements.define('course-builder-editor', CourseBuilderEditor);
}

export { CourseBuilderEditor };
