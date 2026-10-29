import {
  COURSE_BUILDER_MAX_DEPTH,
  COURSE_BUILDER_STORAGE_KEY,
  cloneTree,
  countAssetNodes,
  countNodes,
  createLessonNode,
  normalizeTreeDepths,
  findNodeById,
  getNodePathLabel,
  maxDepth,
  moveNodeInTree,
  moveNodeSibling,
  moveNodeToRoot,
  removeNodeById,
} from './course-builder-utils.js';
import { createBlankCourseBuilderState } from './course-builder-seed.js';

const styles = `
  :host {
    display: block;
    font-family: 'Sarabun', 'Noto Sans Thai', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
    color: #c8d3e2;
  }

  .builder-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .title-block h3 {
    margin: 0 0 .25rem;
    font-size: 1.05rem;
    line-height: 1.18;
    letter-spacing: -.015em;
  }

  .title-block p {
    margin: 0;
    color: var(--muted, #607089);
    font-size: .88rem;
    line-height: 1.55;
  }

  .course-title-field {
    display: grid;
    gap: .35rem;
    margin-top: .7rem;
    max-width: 30rem;
  }

  .course-description-field {
    display: grid;
    gap: .35rem;
    margin-top: .65rem;
    max-width: 42rem;
  }

  .course-title-field label {
    font-size: .76rem;
    font-weight: 700;
    letter-spacing: .02em;
    color: #43536b;
  }

  .course-title-input {
    width: 100%;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.96);
    border-radius: 12px;
    padding: .75rem .85rem;
    font: inherit;
    font-weight: 700;
    color: var(--text, #112033);
  }

  :host-context(body.theme-dark) .course-title-input {
    background: rgba(7,17,31,.98);
    color: #c8d3e2;
    border-color: rgba(125,211,252,.16);
  }

  .course-title-input:focus-visible {
    outline: 2px solid rgba(11,123,220,.75);
    outline-offset: 2px;
  }

  .course-description-textarea {
    width: 100%;
    min-height: 92px;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.96);
    border-radius: 12px;
    padding: .75rem .85rem;
    font: inherit;
    color: var(--text, #112033);
    resize: vertical;
  }

  :host-context(body.theme-dark) .course-description-textarea {
    background: rgba(7,17,31,.98);
    color: #c8d3e2;
    border-color: rgba(125,211,252,.16);
  }

  .course-description-textarea:focus-visible {
    outline: 2px solid rgba(11,123,220,.75);
    outline-offset: 2px;
  }

  :host-context(body.theme-dark) .title-block p,
  :host-context(body.theme-dark) .asset-label,
  :host-context(body.theme-dark) .asset-meta,
  :host-context(body.theme-dark) .node-depth,
  :host-context(body.theme-dark) .pill.subtle,
  :host-context(body.theme-dark) .asset-file {
    color: #b7c5d6;
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
    font-size: .72rem;
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

  .pill.sync-draft {
    background: rgba(249,115,22,.12);
    color: #b45309;
    border-color: rgba(249,115,22,.22);
  }

  .pill.sync-remote {
    background: rgba(34,197,94,.12);
    color: #15803d;
    border-color: rgba(34,197,94,.22);
  }

  :host-context(body.theme-dark) .pill {
    background: rgba(90,211,255,.12);
    color: #c8d3e2;
    border-color: rgba(90,211,255,.18);
  }

  :host-context(body.theme-dark) .pill.subtle {
    background: rgba(255,255,255,.06);
    color: #b7c5d6;
    border-color: rgba(125,211,252,.12);
  }

  .button {
    appearance: none;
    border: 1px solid rgba(15,23,42,.08);
    background: rgba(255,255,255,.86);
    color: var(--text, #112033);
    border-radius: 12px;
    padding: .7rem .9rem;
    font: inherit;
    font-size: .86rem;
    font-weight: 700;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: .45rem;
    letter-spacing: -.01em;
    transition: transform .18s ease, background .18s ease, border-color .18s ease, box-shadow .18s ease, filter .18s ease;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.34), 0 8px 16px rgba(15,23,42,.06);
  }

  :host-context(body.theme-dark) .button {
    background: linear-gradient(180deg, rgba(20,34,59,.98), rgba(10,18,32,.98));
    color: #c8d3e2;
    border-color: rgba(125,211,252,.22);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 10px 20px rgba(0,0,0,.22), 0 0 0 1px rgba(125,211,252,.04);
  }

  .button:hover { transform: translateY(-1px); }
  .button.primary {
    color: #07111f;
    background: linear-gradient(180deg, #7df0df 0%, #69d8ff 100%);
    border-color: rgba(125,211,252,.18);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.36), 0 10px 20px rgba(0,0,0,.20);
  }

  .button.secondary-soft {
    background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.05));
    border-color: rgba(125,211,252,.16);
    color: var(--text);
  }

  .button.secondary-soft:hover {
    border-color: rgba(125,211,252,.28);
    background: linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.06));
  }

  .button.danger {
    color: #be123c;
    background: rgba(244,63,94,.08);
    border-color: rgba(244,63,94,.16);
  }

  .button.icon-btn {
    width: 1.95rem;
    height: 1.95rem;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: .82rem;
    line-height: 1;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.24), 0 6px 12px rgba(15,23,42,.05);
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
    border-radius: 16px;
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
    padding: .9rem .95rem .7rem;
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
    color: #cbd6e4;
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
    color: #c8d3e2;
    border-color: rgba(125,211,252,.16);
  }

  :host-context(body.theme-dark) .details-panel .field input,
  :host-context(body.theme-dark) .details-panel .field select,
  :host-context(body.theme-dark) .details-panel .field textarea {
    background: rgba(10,20,38,.92);
    color: #c8d3e2;
    border-color: rgba(125,211,252,.16);
  }

  :host-context(body.theme-dark) .details-panel .field input::placeholder,
  :host-context(body.theme-dark) .details-panel .field textarea::placeholder {
    color: rgba(168,184,208,.62);
  }

  :host-context(body.theme-dark) .details-panel .field small {
    color: rgba(168,184,208,.72);
  }

  .node-title:focus-visible,
  .url-input:focus-visible,
  .asset-input:focus-visible {
    outline: 2px solid rgba(11,123,220,.75);
    outline-offset: 2px;
  }

  .node-actions {
    display: flex;
    gap: .25rem;
    flex-wrap: nowrap;
    justify-content: flex-end;
    min-width: 0;
  }

  .node-body {
    display: grid;
    gap: .75rem;
    padding: 0 .9rem .9rem;
  }

  .add-inline-btn {
    width: 1.85rem;
    font-size: .92rem;
    background: rgba(34,197,94,.08);
    color: #166534;
    border-color: rgba(34,197,94,.18);
    box-shadow: none;
  }

  :host-context(body.theme-dark) .add-inline-btn {
    background: rgba(34,197,94,.12);
    color: #dcfce7;
    border-color: rgba(34,197,94,.22);
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
    color: #c5d1df;
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
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }

  .builder-main,
  .details-panel,
  .preview-panel-wrap {
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

  :host-context(body.theme-dark) .details-panel .field label,
  :host-context(body.theme-dark) .details-panel .details-head h4,
  :host-context(body.theme-dark) .details-panel .validation strong {
    color: #bfcddb;
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

  :host-context(body.theme-dark) .details-panel .field input,
  :host-context(body.theme-dark) .details-panel .field select,
  :host-context(body.theme-dark) .details-panel .field textarea {
    background: rgba(10,20,38,.94);
    border-color: rgba(125,211,252,.12);
    color: #bfcddb;
  }

  :host-context(body.theme-dark) .details-panel .field input::placeholder,
  :host-context(body.theme-dark) .details-panel .field textarea::placeholder {
    color: rgba(168,184,208,.52);
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

  :host-context(body.theme-dark) .details-panel .field small,
  :host-context(body.theme-dark) .details-panel .validation ul,
  :host-context(body.theme-dark) .details-panel .details-head p {
    color: rgba(168,184,208,.62);
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
    background: linear-gradient(180deg, rgba(10,20,38,.98), rgba(7,17,31,.98));
    color: #bfcddb;
    border: 1px solid rgba(125,211,252,.12);
    box-shadow: 0 18px 32px rgba(15,23,42,.15);
  }

  .preview-panel .eyebrow {
    font-size: .72rem;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: rgba(191,219,254,.52);
  }

  .preview-panel h5 {
    margin: 0;
    font-size: 1.02rem;
    letter-spacing: -.02em;
  }

  .preview-panel p {
    margin: 0;
    color: rgba(226,232,240,.56);
    line-height: 1.6;
    font-size: .88rem;
  }

  .preview-card {
    display: grid;
    gap: .65rem;
    padding: .9rem;
    border-radius: 16px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(125,211,252,.10);
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
    color: #c0d2e8;
  }

  .preview-list {
    margin: 0;
    padding-left: 1rem;
    color: rgba(226,232,240,.56);
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
    color: rgba(191,219,254,.52);
  }

  .preview-asset span {
    font-weight: 600;
  }

  .preview-meta-row {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
  }

  .preview-meta-row .pill {
    background: rgba(255,255,255,.08);
    border-color: rgba(255,255,255,.12);
    color: #c0d2e8;
  }

  .preview-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: .5rem;
  }

  .preview-stat {
    padding: .7rem .75rem;
    border-radius: 14px;
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.08);
  }

  .preview-stat span {
    display: block;
    color: rgba(191,219,254,.48);
    font-size: .72rem;
    text-transform: uppercase;
    letter-spacing: .08em;
    margin-bottom: .25rem;
  }

  .preview-stat strong {
    font-size: .96rem;
    color: #bfcddb;
  }

  .empty-workspace {
    display: grid;
    gap: 1rem;
    align-items: center;
    justify-items: start;
    padding: 1.1rem;
    border-radius: 18px;
    background: rgba(11,123,220,.05);
    border: 1px dashed rgba(11,123,220,.16);
    color: var(--text, #112033);
    min-height: 280px;
  }

  :host-context(body.theme-dark) .empty-workspace {
    background: rgba(90,211,255,.06);
    border-color: rgba(90,211,255,.18);
    color: #c8d3e2;
  }

  .empty-workspace h4 {
    margin: 0;
    font-size: 1.02rem;
    letter-spacing: -.02em;
  }

  .empty-workspace p {
    margin: .3rem 0 0;
    color: var(--muted, #607089);
    line-height: 1.6;
    max-width: 42rem;
  }

  :host-context(body.theme-dark) .empty-workspace p {
    color: rgba(168,184,208,.78);
  }

  .empty-workspace .empty-actions {
    display: flex;
    gap: .5rem;
    flex-wrap: wrap;
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
  const canDelete = !hasChildren;
  const asset = node.asset || { type: 'none', fileName: '', url: '' };
  const nodeType = (node.nodeType || (currentDepth <= 1 ? 'section' : 'lesson')).toLowerCase();
  const hasVideo = Boolean(node.videoUrl || (asset && asset.type === 'url' && String(asset.url || '').includes('/videos/play?mediaId=')));
  const videoLabel = hasVideo
    ? node.videoStatus === 'ready' ? 'วิดีโอพร้อม' : node.videoStatus === 'failed' ? 'วิดีโอมีปัญหา' : 'กำลังเตรียมวิดีโอ'
    : 'ยังไม่มีวิดีโอ';

  return `
    <article class="node ${node.id === selectedId ? 'selected' : ''} ${draggingNodeId === node.id ? 'dragging' : ''}" data-node-id="${node.id}" data-path="${pathLabel}" role="button" tabindex="0" aria-label="เลือกบทเรียน ${escapeHtml(node.title)}">
      <div class="node-head ${dropTarget?.zone === 'after' && dropTarget?.nodeId === node.id ? 'drop-active' : ''}" data-drop-zone="after" data-node-id="${node.id}">
        <div style="flex: 1; min-width: 0;">
          <div class="node-label">
            <span class="node-path">${pathLabel}</span>
            <span class="node-depth">ชั้น ${currentDepth}</span>
            <span class="pill subtle">${hasChildren ? `${node.children.length} บทเรียนย่อย` : 'ไม่มีบทเรียนย่อย'}</span>
            <span class="pill ${nodeType === 'section' ? 'sync-draft' : 'sync-remote'}">${escapeHtml(nodeType)}</span>
            <span class="pill ${hasVideo ? 'sync-remote' : 'sync-draft'}">${videoLabel}</span>
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
          <button class="button icon-btn add-inline-btn" type="button" data-action="add-child" data-node-id="${node.id}" aria-label="เพิ่มบทเรียนย่อย" title="${disableAdd ? 'เพิ่มไม่ได้เมื่อถึงลึกสุด' : 'เพิ่มบทเรียนย่อย'}" ${disableAdd ? 'disabled' : ''}>+</button>
          <button class="button icon-btn" type="button" data-action="move-up" data-node-id="${node.id}" aria-label="เลื่อนบทเรียนขึ้น" title="เลื่อนขึ้น">↑</button>
          <button class="button icon-btn" type="button" data-action="move-down" data-node-id="${node.id}" aria-label="เลื่อนบทเรียนลง" title="เลื่อนลง">↓</button>
          <button class="button danger icon-btn" type="button" data-action="delete" data-node-id="${node.id}" ${canDelete ? '' : 'disabled'} title="${canDelete ? 'ลบบทเรียนนี้' : 'ลบไม่ได้เพราะยังมีบทเรียนย่อย'}" aria-label="ลบบทเรียนนี้">🗑</button>
        </div>
      </div>

      <div class="children ${draggingNodeId ? 'droppable' : ''} ${dropTarget?.zone === 'inside' && dropTarget?.nodeId === node.id ? 'drop-active' : ''}" data-drop-zone="inside" data-node-id="${node.id}">
        ${hasChildren ? node.children.map((child, index) => renderNode(child, [...pathParts, index + 1], selectedId, depthLimit, draggingNodeId, dropTarget)).join('') : '<div class="empty">ยังไม่มีบทเรียนย่อย</div>'}
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

function getStorageScope() {
  const sessionTenant = window.CourseChic?.getSession?.()?.tenantSlug;
  const pageTenant = document.body?.dataset?.tenantSlug || window.COURSECHIC_DEFAULT_TENANT_SLUG || null;
  const hostTenant = (() => {
    try {
      const host = window.location.hostname.toLowerCase();
      const appDomain = 'coursechic.com';
      if (!host.endsWith(`.${appDomain}`) || host === appDomain) {
        return null;
      }
      return host.slice(0, -(appDomain.length + 1));
    } catch {
      return null;
    }
  })();
  return String(sessionTenant || pageTenant || hostTenant || 'global').trim().toLowerCase() || 'global';
}

function getStorageKey(courseId) {
  const scope = getStorageScope();
  const courseKey = courseId ? String(courseId).trim() : 'draft';
  return `${COURSE_BUILDER_STORAGE_KEY}:${scope}:${courseKey}`;
}

function getLegacyStorageKey(courseId) {
  return courseId ? `${COURSE_BUILDER_STORAGE_KEY}:${courseId}` : COURSE_BUILDER_STORAGE_KEY;
}

function remoteNodeToLocal(node) {
  const asset = node.asset || {};
  return {
    id: node.id,
    title: normalizeNodeTitle(node.title),
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
    videoUrl: node.videoUrl || '',
    videoStatus: node.videoStatus || null,
    videoMediaId: node.videoMediaId || null,
    videoHlsUrl: node.videoHlsUrl || null,
    videoPosterUrl: node.videoPosterUrl || null,
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
  const node = createLessonNode({
    title: normalizeNodeTitle(module.title) || 'บทเรียนใหม่',
    depth: 1,
    asset: module.videoUrl
      ? {
          type: 'url',
          fileName: '',
          url: module.videoUrl,
        }
      : undefined,
  });
  node.nodeType = 'lesson';
  return node;
}

function normalizeNodeTitle(title) {
  const value = String(title || '').trim();
  if (!value) return 'บทเรียนใหม่';
  if (/^no course$/i.test(value) || /^course preview$/i.test(value)) {
    return 'บทเรียนใหม่';
  }
  return value;
}

function normalizeTreeTitles(nodes) {
  return (Array.isArray(nodes) ? nodes : []).map((node) => ({
    ...node,
    title: normalizeNodeTitle(node.title),
    children: normalizeTreeTitles(node.children || []),
  }));
}

function mergeVideoMetadata(nodes, remoteNodes) {
  const lookup = new Map();
  const indexRemote = (items) => {
    (Array.isArray(items) ? items : []).forEach((node) => {
      lookup.set(String(node.id), node);
      indexRemote(node.children);
    });
  };
  indexRemote(remoteNodes);
  return (Array.isArray(nodes) ? nodes : []).map((node) => {
    const remote = lookup.get(String(node.id));
    return {
      ...node,
      videoUrl: remote?.videoUrl || node.videoUrl || '',
      videoStatus: remote?.videoStatus || node.videoStatus || null,
      videoMediaId: remote?.videoMediaId || node.videoMediaId || null,
      videoHlsUrl: remote?.videoHlsUrl || node.videoHlsUrl || null,
      videoPosterUrl: remote?.videoPosterUrl || node.videoPosterUrl || null,
      children: mergeVideoMetadata(node.children || [], remote?.children || []),
    };
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
    this.state = createBlankCourseBuilderState();
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
    const previousSelectedNodeId = this.selectedNodeId;
    const remoteTree = Array.isArray(course.tree) ? course.tree : [];
    const remoteLocalNodes = remoteTree.length ? remoteTree.map(remoteNodeToLocal) : [];
    this.course = {
      ...this.course,
      id: course.id ?? this.course.id,
      remoteCourseId: course.remoteCourseId ?? this.course.remoteCourseId ?? null,
      title: course.title || this.course.title,
      status: course.status || this.course.status,
      description: course.description ?? this.course.description ?? '',
      modules: Array.isArray(course.modules) ? course.modules : [],
    };
    this.storageKey = getStorageKey(this.course.id || this.course.remoteCourseId || null);
    const persisted = this.readPersisted();
    if (remoteLocalNodes.length) {
      this.state.nodes = remoteLocalNodes;
      const preservedSelected = previousSelectedNodeId && findNodeById(this.state.nodes, previousSelectedNodeId)
        ? previousSelectedNodeId
        : this.state.nodes[0]?.id || null;
      this.selectedNodeId = preservedSelected;
      this.syncStatus = 'synced';
      this.isDirty = false;
      this.persist();
    } else if (persisted?.nodes?.length) {
      this.restore(true);
      this.state.nodes = mergeVideoMetadata(this.state.nodes, course.tree || course.modules || []);
      if (previousSelectedNodeId && findNodeById(this.state.nodes, previousSelectedNodeId)) {
        this.selectedNodeId = previousSelectedNodeId;
      }
    } else if (this.course.modules.length) {
      this.state.nodes = this.course.modules.map(moduleToLocalNode);
      const preservedSelected = previousSelectedNodeId && findNodeById(this.state.nodes, previousSelectedNodeId)
        ? previousSelectedNodeId
        : this.state.nodes[0]?.id || null;
      this.selectedNodeId = preservedSelected;
    } else {
      this.state.nodes = [];
      this.selectedNodeId = null;
    }
    this.render();
    void this.hydrateCourse();
  }

  startFreshCourse() {
    this.state = createBlankCourseBuilderState();
    const firstRoot = createLessonNode({
      title: 'บทเรียนใหม่',
      depth: 1,
    });
    firstRoot.nodeType = 'lesson';
    this.state.nodes = [firstRoot];
    this.selectedNodeId = firstRoot.id;
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
    this.lastSavedAt = null;
    this.persist();
    this.render();
    this.dispatchSelection();
    requestAnimationFrame(() => {
      this.shadowRoot?.querySelector('#courseTitleInput')?.focus();
    });
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

  dispatchSelection() {
    const selected = this.getSelectedNodeTrail();
    if (!selected?.node) return;
    this.dispatchEvent(new CustomEvent('course-builder:select-node', {
      bubbles: true,
      composed: true,
      detail: {
        node: cloneTree([selected.node])[0],
        path: selected.trail.join('.'),
      },
    }));
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
    if (!session?.nestToken && !session?.token) {
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

    if (!remoteCourseId && stored?.nodes?.length && token === this.hydrationToken) {
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

    if (!session?.nestToken && !session?.token) {
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
      const node = event.target.closest('.node[data-node-id]');
      if (!button && node) {
        this.selectedNodeId = node.dataset.nodeId;
        this.render();
        this.dispatchSelection();
        return;
      }
      if (!button) return;
      const action = button.dataset.action;
      const nodeId = button.dataset.nodeId;

      if (action === 'delete') {
        const targetNode = findNodeById(this.state.nodes, nodeId);
        if (targetNode?.children?.length) {
          window.alert('ลบไม่ได้ เพราะบทเรียนนี้ยังมีบทเรียนย่อยอยู่');
          return;
        }
        const confirmed = window.confirm('ยืนยันการลบบทเรียนนี้?');
        if (!confirmed) {
          return;
        }
        this.deleteNode(nodeId);
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

      if (action === 'add-child') {
        this.addChild(nodeId);
        return;
      }

      if (action === 'add-root') {
        const rootNode = createLessonNode({
          title: 'บทเรียนใหม่',
          depth: 1,
        });
        rootNode.nodeType = 'lesson';
        this.state.nodes = [...this.state.nodes, rootNode];
        this.selectedNodeId = rootNode.id;
        this.markDirty();
        this.persist();
        this.render();
        this.scheduleAutoSave();
        this.dispatchSelection();
        return;
      }

      if (action === 'clear-asset') {
        this.clearAsset(nodeId);
        return;
      }

      if (action === 'publish-course') {
        void this.publishCourse().catch((error) => {
          console.error(error);
          window.alert(error?.message || 'เผยแพร่ไม่สำเร็จ');
        });
        return;
      }

    });

    root.addEventListener('change', (event) => {
      const input = event.target.closest('[data-action="title"], [data-action="course-title"], [data-action="course-description"], [data-action="asset-url"], [data-action="asset-file"], [data-action="node-type"], [data-action="estimated-minutes"], [data-action="content-type"], [data-action="description"], [data-action="plain-text"], [data-action="html-content"], [data-action="transcript-lines"]');
      if (!input) return;
      const nodeId = input.dataset.nodeId;

      if (input.dataset.action === 'title') {
        this.updateNode(nodeId, (node) => {
          node.title = input.value;
        });
      }

      if (input.dataset.action === 'course-title') {
        this.course.title = input.value;
        this.markDirty();
        this.persist();
        this.render();
        this.scheduleAutoSave();
      }

      if (input.dataset.action === 'course-description') {
        this.course.description = input.value;
        this.markDirty();
        this.persist();
        this.render();
        this.scheduleAutoSave();
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

    root.addEventListener('keydown', (event) => {
      const node = event.target.closest('.node[data-node-id]');
      if (!node) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      this.selectedNodeId = node.dataset.nodeId;
      this.render();
      this.dispatchSelection();
    });

  }

  readPersisted() {
    try {
      const raw = localStorage.getItem(this.storageKey) || localStorage.getItem(getLegacyStorageKey(this.course.id || this.course.remoteCourseId || null));
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

  addChild(nodeId) {
    const next = cloneTree(this.state.nodes);
    const parent = findNodeById(next, nodeId);
    if (!parent) return;
    const currentDepth = parent.depth || 1;
    if (currentDepth >= COURSE_BUILDER_MAX_DEPTH) {
      return;
    }

    parent.children = parent.children || [];
    const child = createLessonNode({
      title: 'บทเรียนย่อยใหม่',
      depth: currentDepth + 1,
    });
    parent.children.push(child);
    this.state.nodes = normalizeTreeDepths(next);
    this.selectedNodeId = child.id;
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

  deleteNode(nodeId) {
    const next = removeNodeById(this.state.nodes, nodeId);
    this.state.nodes = next.length ? normalizeTreeDepths(next) : [];
    this.selectedNodeId = this.state.nodes[0]?.id || null;
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
        description: this.course.description || '',
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

  buildLessonPreview() {
    const selectedNodeTrail = this.getSelectedNodeTrail();
    const selectedNode = selectedNodeTrail?.node || this.getSelectedNode();
    if (!selectedNode) return null;

    return {
      lesson: {
        ...selectedNode,
        trail: selectedNodeTrail?.trail || [],
        path: selectedNodeTrail?.trail?.join('.') || '',
      },
      course: {
        title: this.course.title || this.state.courseTitle,
        description: this.course.description || '',
        slug: slugify(this.course.title || this.state.courseTitle) || 'course-preview',
        nodes: cloneTree(this.state.nodes),
      },
    };
  }

  persist() {
    try {
      this.state.nodes = normalizeTreeTitles(this.state.nodes);
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

    const preview = this.buildLessonPreview();
    if (preview) {
      if (window.CourseChic?.setLessonPreview) {
        window.CourseChic.setLessonPreview(preview);
      } else {
        localStorage.setItem('coursechic.courseBuilder.lessonPreview', JSON.stringify(preview));
      }
    }
  }

  restore(silent = false) {
    try {
      const raw = localStorage.getItem(this.storageKey) || localStorage.getItem(getLegacyStorageKey(this.course.id || this.course.remoteCourseId || null));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.nodes?.length) {
        this.state.nodes = normalizeTreeTitles(parsed.nodes);
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
    const courseTitle = String(this.course.title || '').trim();
    const courseDescription = String(this.course.description || '').trim();
    if (!courseTitle || courseTitle === 'คอร์สใหม่') {
      issues.push({ type: 'error', text: 'กรุณาตั้งชื่อคอร์สก่อนเผยแพร่' });
    }
    if (!courseDescription) {
      issues.push({ type: 'error', text: 'กรุณาใส่คำอธิบายคอร์สก่อนเผยแพร่' });
    }
    if (!this.state.nodes.length) {
      issues.push({ type: 'error', text: 'คอร์สนี้ยังไม่มีบทเรียน ให้กด “เพิ่มบทเรียน” เพื่อเริ่มต้น' });
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
    let session = window.CourseChic?.getSession?.();
    if (!session?.nestToken && !session?.token && typeof window.CourseChic?.ensureNestSession === 'function') {
      await window.CourseChic.ensureNestSession().catch(() => null);
      session = window.CourseChic?.getSession?.();
    }
    if (!session?.nestToken && !session?.token) {
      throw new Error('ต้องลงชื่อเข้าใช้ backend ฝั่งคอร์สก่อนจึงจะเผยแพร่ได้');
    }

    if (!this.course.remoteCourseId) {
      await this.ensureRemoteCourse();
    }

    const remoteCourseId = this.course.remoteCourseId;
    if (!remoteCourseId) {
      throw new Error('ยังสร้างคอร์สปลายทางไม่สำเร็จ');
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

  async ensureRemoteCourse() {
    const session = window.CourseChic?.getSession?.();
    if (!session?.nestToken && !session?.token) {
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
    if (!session?.nestToken && !session?.token) {
      return { mode: 'local' };
    }

    const remoteCourseId = await this.ensureRemoteCourse();
    if (!remoteCourseId) {
      return { mode: 'local' };
    }

    await window.CourseChic.requestNest(`/courses/${remoteCourseId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        title: this.course.title || this.state.courseTitle,
        description: this.course.description || '',
      }),
    });

    const idRemap = new Map();
    const createTree = async (nodes, parentId = null) => {
      for (const node of nodes) {
        const hasRemoteId = /^\d+$/.test(String(node.id || ''));
        let remoteNodeId = hasRemoteId ? String(node.id) : null;
        if (hasRemoteId) {
          await window.CourseChic.requestNest(`/lesson-nodes/${remoteNodeId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              parentId,
              nodeType: this.getNodeType(node),
              title: node.title,
              estimatedMinutes: Number(node.estimatedMinutes || 0),
            }),
          });
        } else {
          const created = await window.CourseChic.requestNest(`/courses/${remoteCourseId}/nodes`, {
            method: 'POST',
            body: JSON.stringify({
              parentId,
              nodeType: this.getNodeType(node),
              title: node.title,
              estimatedMinutes: Number(node.estimatedMinutes || 0),
            }),
          });
          remoteNodeId = created?.data?.id ?? created?.id;
          const previousId = String(node.id || '');
          if (previousId && remoteNodeId) {
            idRemap.set(previousId, String(remoteNodeId));
          }
          node.id = String(remoteNodeId);
          if (String(this.selectedNodeId || '') === previousId) {
            this.selectedNodeId = String(remoteNodeId);
          }
        }
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
    if (idRemap.size && String(this.selectedNodeId || '') && idRemap.has(String(this.selectedNodeId))) {
      this.selectedNodeId = idRemap.get(String(this.selectedNodeId)) || this.selectedNodeId;
    }
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
  const previewModeLabel = this.course.remoteCourseId ? 'คอร์สจริง' : 'พรีวิว draft';
  const previewModeClass = this.course.remoteCourseId ? 'sync-remote' : 'sync-draft';
  const publishStateLabel = this.course.status === 'published'
    ? 'เผยแพร่แล้ว'
    : this.course.remoteCourseId
      ? 'ซิงก์แล้ว'
      : 'ฉบับร่าง';
    const selectedNodeTrail = this.getSelectedNodeTrail();
    const selectedNode = selectedNodeTrail?.node || this.getSelectedNode();
    const previewLines = makePreviewLines(selectedNode);
    const previewAsset = makeAssetPreview(selectedNode);
    const validationIssues = this.validateTree();
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
    const isEmptyCourse = !this.state.nodes.length;
    const courseName = this.course.title || this.state.courseTitle || 'คอร์สใหม่';

    this.shadowRoot.innerHTML = `
      <style>${styles}</style>
      <section class="builder" data-role="builder-form">
        <div class="builder-head">
          <div class="title-block">
            <div class="meta">
              <span class="pill ${previewModeClass}">${escapeHtml(previewModeLabel)}</span>
              <span class="pill subtle">${escapeHtml(syncLabel)}</span>
              <span class="pill subtle">${escapeHtml(publishStateLabel)}</span>
            </div>
            <h3>${escapeHtml(courseTitle)}</h3>
            <div class="course-title-field">
              <label for="courseTitleInput">ชื่อคอร์ส</label>
              <input
                id="courseTitleInput"
                class="course-title-input"
                data-action="course-title"
                value="${escapeHtml(courseName)}"
                placeholder="ตั้งชื่อคอร์ส เช่น เคมีพื้นฐาน"
              />
            </div>
            <div class="course-description-field">
              <label for="courseDescriptionInput">คำอธิบายคอร์ส</label>
              <textarea
                id="courseDescriptionInput"
                class="course-description-textarea"
                data-action="course-description"
                placeholder="อธิบายสิ่งที่ผู้เรียนจะได้เรียน ระดับของคอร์ส หรือผลลัพธ์ที่คาดหวัง"
              >${escapeHtml(this.course.description || '')}</textarea>
            </div>
            <p>จัดโครงบทเรียนและแก้เนื้อหาได้จากจุดเดียว ต้องมีชื่อและคำอธิบายคอร์สก่อนเผยแพร่</p>
          </div>
          <div class="toolbar">
            <button class="button primary" type="button" data-action="add-root">+ เพิ่มบทเรียน</button>
            <button class="button secondary-soft" type="button" data-action="publish-course">เผยแพร่</button>
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
              ${isEmptyCourse ? `
                <div class="empty-workspace">
                  <div>
                    <span class="pill subtle">เริ่มจากศูนย์</span>
                    <h4>คอร์สนี้ยังไม่มีบทเรียน</h4>
                    <p>กด “เพิ่มบทเรียน” เพื่อสร้างโครงแรก จากนั้นค่อยใส่บทเรียนย่อย เนื้อหา และวิดีโอในแต่ละบทเรียน</p>
                  </div>
                  <div class="empty-actions">
                    <button class="button primary" type="button" data-action="add-root">+ เพิ่มบทเรียนแรก</button>
                    <button class="button secondary-soft" type="button" data-action="publish-course" disabled>เผยแพร่ได้เมื่อมีบทเรียน</button>
                  </div>
                </div>
              ` : this.state.nodes.map((node, index) => renderNode(node, [index + 1], this.selectedNodeId, COURSE_BUILDER_MAX_DEPTH, this.draggingNodeId, this.dropTarget)).join('')}
            </div>
          </div>

          <aside class="details-panel">
            <div class="details-head">
              <h4>${selectedNode ? escapeHtml(selectedNode.title || 'บทเรียนที่เลือก') : 'เลือกบทเรียน'}</h4>
              <p>${selectedNode ? `เส้นทาง ${selectedNodeTrail?.trail?.join('.') || '-'} • ชั้น ${selectedNode.depth || 1}` : 'ยังไม่มีบทเรียน ให้เริ่มจากปุ่ม “เพิ่มบทเรียนแรก” ทางซ้าย'}</p>
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
                  ${['section', 'lesson', 'quiz', 'assignment'].map((type) => `<option value="${type}" ${selectedNode?.nodeType === type ? 'selected' : ''}>${type === 'assignment' ? 'การบ้าน' : type}</option>`).join('')}
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
          </aside>

          <aside class="preview-panel-wrap">
            <div class="preview-panel">
              <div class="eyebrow">ตัวอย่างสด</div>
              <h5>${selectedNode ? escapeHtml(selectedNode.title || 'บทเรียนที่เลือก') : 'เลือกบทเรียน'}</h5>
              <p>${selectedNode ? escapeHtml(selectedNode.description || 'ตัวอย่างนี้สะท้อนสิ่งที่นักเรียนจะเห็นในหน้าบทเรียน') : 'เลือกโหนดจากต้นไม้เพื่อดูตัวอย่างตรงนี้'}</p>
              <div class="preview-meta-row">
                <span class="pill">Path ${escapeHtml(selectedNodeTrail?.trail?.join('.') || '-')}</span>
                <span class="pill">${escapeHtml(selectedNode?.nodeType || 'lesson')}</span>
                <span class="pill">${escapeHtml(`~${selectedNode?.estimatedMinutes || 0} min`)}</span>
              </div>
              <div class="preview-summary">
                <div class="preview-stat">
                  <span>เนื้อหา</span>
                  <strong>${escapeHtml(selectedNode?.contentType || 'article')}</strong>
                </div>
                <div class="preview-stat">
                  <span>ไฟล์แนบ</span>
                  <strong>${escapeHtml(previewAsset.label)}</strong>
                </div>
              </div>
              <div class="preview-card">
                <div class="preview-asset">
                  <strong>${escapeHtml(previewAsset.label)}</strong>
                  <span>${escapeHtml(previewAsset.value)}</span>
                  <small style="color: rgba(226,232,240,.76);">${escapeHtml(previewAsset.hint)}</small>
                </div>
                <ul class="preview-list">
                  ${previewLines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}
                </ul>
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
