import * as Y from "yjs";
import type {
  WorkspaceBlock,
  WorkspaceBlockType,
  WorkspaceCommentScope,
  WorkspaceComment,
  WorkspaceHighlightColor,
  WorkspaceNumberedListMode,
  WorkspaceTextMark,
  WorkspaceTextMarkType,
} from "./types";

const BLOCKS_KEY = "blocks";
const COMMENTS_KEY = "comments";
const DEFAULT_BLOCK_TYPE: WorkspaceBlockType = "paragraph";
const MAX_INDENT = 3;

type BlockValue = string | boolean | number;

export interface WorkspaceCommentRange {
  blockId: string;
  selectedText?: string;
  selectionStart: number;
  selectionEnd: number;
}

function normalizedIndent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_INDENT, Math.trunc(value)));
}

function isHighlightColor(value: unknown): value is WorkspaceHighlightColor {
  return value === "yellow" || value === "green" || value === "blue" || value === "pink" || value === "purple";
}

function isWorkspaceCommentScope(value: unknown): value is WorkspaceCommentScope {
  return value === "inline" || value === "block";
}

function newBlockMap(block: WorkspaceBlock): Y.Map<BlockValue> {
  const map = new Y.Map<BlockValue>();
  map.set("id", block.id);
  map.set("text", block.text);
  map.set("type", block.type);
  if (block.indent !== undefined) {
    map.set("indent", normalizedIndent(block.indent));
  }
  if (block.type === "numbered" && isWorkspaceNumberedListMode(block.numbering)) {
    map.set("numbering", block.numbering);
  }
  if (block.checked !== undefined) {
    map.set("checked", block.checked);
  }
  if (block.linkDisabled !== undefined) {
    map.set("linkDisabled", block.linkDisabled);
  }
  if (block.collapsed !== undefined) {
    map.set("collapsed", block.collapsed);
  }
  if (block.url !== undefined) {
    map.set("url", block.url);
  }
  if (block.caption !== undefined) {
    map.set("caption", block.caption);
  }
  if (block.inlineMarks !== undefined) {
    map.set("inlineMarks", serializeInlineMarks(block.inlineMarks));
  }
  return map;
}

function parseInlineMarks(value: unknown, textLength: number): WorkspaceTextMark[] {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as WorkspaceTextMark[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((mark): mark is WorkspaceTextMark => {
        return (
          typeof mark.id === "string" &&
          (mark.type === "bold" || mark.type === "italic" || mark.type === "highlight" || mark.type === "comment") &&
          typeof mark.start === "number" &&
          typeof mark.end === "number" &&
          mark.start >= 0 &&
          mark.end > mark.start
        );
      })
      .map((mark) => ({
        id: mark.id,
        type: mark.type,
        start: Math.max(0, Math.min(textLength, Math.trunc(mark.start))),
        end: Math.max(0, Math.min(textLength, Math.trunc(mark.end))),
        commentId: typeof mark.commentId === "string" ? mark.commentId : undefined,
        color: isHighlightColor(mark.color) ? mark.color : undefined,
      }))
      .filter((mark) => mark.end > mark.start)
      .sort((a, b) => a.start - b.start || a.end - b.end);
  } catch {
    return [];
  }
}

function serializeInlineMarks(marks: WorkspaceTextMark[]): string {
  return JSON.stringify(marks);
}

function readInlineMarks(block: Y.Map<BlockValue>): WorkspaceTextMark[] {
  const text = String(block.get("text") ?? "");
  return parseInlineMarks(block.get("inlineMarks"), text.length);
}

function setInlineMarks(block: Y.Map<BlockValue>, marks: WorkspaceTextMark[]) {
  const text = String(block.get("text") ?? "");
  const normalized = marks
    .map((mark) => ({
      ...mark,
      start: Math.max(0, Math.min(text.length, Math.trunc(mark.start))),
      end: Math.max(0, Math.min(text.length, Math.trunc(mark.end))),
    }))
    .filter((mark) => mark.end > mark.start);

  if (normalized.length === 0) {
    block.delete("inlineMarks");
  } else {
    block.set("inlineMarks", serializeInlineMarks(normalized));
  }
}

function addCommentMark(block: Y.Map<BlockValue>, commentId: string, start: number, end: number) {
  const marks = readInlineMarks(block);
  marks.push({
    id: createBlockId(),
    type: "comment",
    start,
    end,
    commentId,
  });
  setInlineMarks(block, marks);
}

function removeCommentMarks(doc: Y.Doc, commentId: string) {
  getBlocksArray(doc)
    .toArray()
    .forEach((block) => {
      const marks = readInlineMarks(block);
      const nextMarks = marks.filter((mark) => mark.type !== "comment" || mark.commentId !== commentId);
      if (nextMarks.length !== marks.length) {
        setInlineMarks(block, nextMarks);
      }
    });
}

export function removeResolvedCommentMarks(doc: Y.Doc) {
  const resolvedCommentIds = new Set(
    getCommentsArray(doc)
      .toArray()
      .filter((comment) => comment.get("resolved") === true)
      .map((comment) => String(comment.get("id") ?? "")),
  );
  if (resolvedCommentIds.size === 0) return;

  doc.transact(() => {
    for (const commentId of resolvedCommentIds) {
      if (commentId) removeCommentMarks(doc, commentId);
    }
  }, "local");
}

export function createBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getBlocksArray(doc: Y.Doc): Y.Array<Y.Map<BlockValue>> {
  return doc.getArray<Y.Map<BlockValue>>(BLOCKS_KEY);
}

export function getCommentsArray(doc: Y.Doc): Y.Array<Y.Map<BlockValue>> {
  return doc.getArray<Y.Map<BlockValue>>(COMMENTS_KEY);
}

export function readBlocks(doc: Y.Doc): WorkspaceBlock[] {
  return getBlocksArray(doc).toArray().map((block) => {
    const typeValue = block.get("type");
    const checkedValue = block.get("checked");
    const linkDisabledValue = block.get("linkDisabled");
    const collapsedValue = block.get("collapsed");
    const urlValue = block.get("url");
    const captionValue = block.get("caption");
    const text = String(block.get("text") ?? "");
    const type = isWorkspaceBlockType(typeValue) ? typeValue : DEFAULT_BLOCK_TYPE;
    const numberingValue = block.get("numbering");
    return {
      id: String(block.get("id") ?? createBlockId()),
      text,
      type,
      checked: typeof checkedValue === "boolean" ? checkedValue : false,
      linkDisabled: typeof linkDisabledValue === "boolean" ? linkDisabledValue : false,
      indent: normalizedIndent(block.get("indent")),
      numbering: type === "numbered" && isWorkspaceNumberedListMode(numberingValue) ? numberingValue : undefined,
      collapsed: typeof collapsedValue === "boolean" ? collapsedValue : false,
      url: typeof urlValue === "string" ? urlValue : "",
      caption: typeof captionValue === "string" ? captionValue : "",
      inlineMarks: parseInlineMarks(block.get("inlineMarks"), text.length),
    };
  });
}

export function readComments(doc: Y.Doc): WorkspaceComment[] {
  return getCommentsArray(doc)
    .toArray()
    .map((comment) => {
      const resolvedAt = comment.get("resolvedAt");
      return {
        id: String(comment.get("id") ?? createBlockId()),
        blockId: String(comment.get("blockId") ?? ""),
        text: String(comment.get("text") ?? ""),
        author: String(comment.get("author") ?? ""),
        createdAt: typeof comment.get("createdAt") === "number" ? Number(comment.get("createdAt")) : 0,
        resolved: comment.get("resolved") === true,
        resolvedAt: typeof resolvedAt === "number" ? Number(resolvedAt) : undefined,
        selectedText: typeof comment.get("selectedText") === "string" ? String(comment.get("selectedText")) : undefined,
        selectionStart:
          typeof comment.get("selectionStart") === "number" ? Number(comment.get("selectionStart")) : undefined,
        selectionEnd: typeof comment.get("selectionEnd") === "number" ? Number(comment.get("selectionEnd")) : undefined,
        commentScope: isWorkspaceCommentScope(comment.get("commentScope"))
          ? (comment.get("commentScope") as WorkspaceCommentScope)
          : undefined,
      };
    })
    .filter((comment) => comment.blockId.length > 0)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function ensureInitialBlock(doc: Y.Doc) {
  const blocks = getBlocksArray(doc);
  if (blocks.length > 0) return;

  doc.transact(() => {
    blocks.push([newBlockMap({ id: createBlockId(), text: "", type: DEFAULT_BLOCK_TYPE })]);
  }, "local");
}

export function updateBlockText(doc: Y.Doc, blockId: string, text: string) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    const existingMarks = readInlineMarks(block);
    block.set("text", text);
    setInlineMarks(block, existingMarks);
  }, "local");
}

export function updateBlockType(
  doc: Y.Doc,
  blockId: string,
  type: WorkspaceBlockType,
  options: { text?: string; checked?: boolean; url?: string; caption?: string } = {},
) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    block.set("type", type);
    if (options.text !== undefined) block.set("text", options.text);
    if (type === "checklist") {
      block.set("checked", options.checked ?? Boolean(block.get("checked")));
    } else {
      block.delete("checked");
    }
    if (type !== "numbered") {
      block.delete("numbering");
    }
    if (type === "toggle") {
      block.set("collapsed", Boolean(block.get("collapsed")));
    } else {
      block.delete("collapsed");
    }
    if (type === "image" || type === "fileLink") {
      if (options.url !== undefined) block.set("url", options.url);
      if (options.caption !== undefined) block.set("caption", options.caption);
    } else {
      block.delete("url");
      block.delete("caption");
    }
  }, "local");
}

export function updateBlockNumbering(doc: Y.Doc, blockId: string, mode?: WorkspaceNumberedListMode) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block || block.get("type") !== "numbered") return;

  doc.transact(() => {
    if (isWorkspaceNumberedListMode(mode)) {
      block.set("numbering", mode);
    } else {
      block.delete("numbering");
    }
  }, "local");
}

export function updateBlockChecked(doc: Y.Doc, blockId: string, checked: boolean) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    block.set("checked", checked);
  }, "local");
}

export function updateBlockLinkDisabled(doc: Y.Doc, blockId: string, disabled: boolean) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    block.set("linkDisabled", disabled);
  }, "local");
}

export function updateBlockCollapsed(doc: Y.Doc, blockId: string, collapsed: boolean) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    block.set("collapsed", collapsed);
  }, "local");
}

export function updateBlockIndent(doc: Y.Doc, blockId: string, delta: -1 | 1) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    block.set("indent", normalizedIndent(normalizedIndent(block.get("indent")) + delta));
  }, "local");
}

export function updateBlockMedia(
  doc: Y.Doc,
  blockId: string,
  fields: { url?: string; caption?: string; text?: string },
) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    if (fields.url !== undefined) block.set("url", fields.url);
    if (fields.caption !== undefined) block.set("caption", fields.caption);
    if (fields.text !== undefined) block.set("text", fields.text);
  }, "local");
}

export function addBlockComment(
  doc: Y.Doc,
  fields: Pick<WorkspaceComment, "blockId" | "text" | "author" | "createdAt"> &
    Partial<Pick<WorkspaceComment, "selectedText" | "selectionStart" | "selectionEnd">> & {
      commentScope?: WorkspaceCommentScope;
      markedRanges?: WorkspaceCommentRange[];
    },
): string {
  const comments = getCommentsArray(doc);
  const id = createBlockId();

  doc.transact(() => {
    const map = new Y.Map<BlockValue>();
    map.set("id", id);
    map.set("blockId", fields.blockId);
    map.set("text", fields.text);
    map.set("author", fields.author);
    map.set("createdAt", fields.createdAt);
    map.set("resolved", false);
    if (fields.selectedText !== undefined) map.set("selectedText", fields.selectedText);
    if (fields.selectionStart !== undefined) map.set("selectionStart", fields.selectionStart);
    if (fields.selectionEnd !== undefined) map.set("selectionEnd", fields.selectionEnd);
    if (fields.commentScope !== undefined) map.set("commentScope", fields.commentScope);
    comments.push([map]);

    const ranges =
      fields.markedRanges && fields.markedRanges.length > 0
        ? fields.markedRanges
        : fields.selectionStart !== undefined && fields.selectionEnd !== undefined
          ? [{ blockId: fields.blockId, selectionStart: fields.selectionStart, selectionEnd: fields.selectionEnd }]
          : [];

    const blocks = getBlocksArray(doc).toArray();
    for (const range of ranges) {
      const block = blocks.find((candidate) => candidate.get("id") === range.blockId);
      if (block) {
        addCommentMark(block, id, range.selectionStart, range.selectionEnd);
      }
    }
  }, "local");

  return id;
}

export function applyInlineMark(
  doc: Y.Doc,
  blockId: string,
  type: Exclude<WorkspaceTextMarkType, "comment">,
  start: number,
  end: number,
  options: { color?: WorkspaceHighlightColor } = {},
) {
  const block = getBlocksArray(doc).toArray().find((candidate) => candidate.get("id") === blockId);
  if (!block) return;

  doc.transact(() => {
    const marks = readInlineMarks(block);
    const normalizedStart = Math.max(0, Math.min(String(block.get("text") ?? "").length, Math.trunc(start)));
    const normalizedEnd = Math.max(0, Math.min(String(block.get("text") ?? "").length, Math.trunc(end)));
    if (normalizedEnd <= normalizedStart) return;

    const existingIndex = marks.findIndex(
      (mark) =>
        mark.type === type &&
        mark.start === normalizedStart &&
        mark.end === normalizedEnd &&
        (type !== "highlight" || (mark.color ?? "yellow") === (options.color ?? "yellow")),
    );
    if (existingIndex >= 0) {
      marks.splice(existingIndex, 1);
    } else {
      marks.push({
        id: createBlockId(),
        type,
        start: normalizedStart,
        end: normalizedEnd,
        color: type === "highlight" ? options.color ?? "yellow" : undefined,
      });
    }
    setInlineMarks(block, marks);
  }, "local");
}

export function setBlockCommentResolved(doc: Y.Doc, commentId: string, resolved: boolean) {
  const comment = getCommentsArray(doc).toArray().find((candidate) => candidate.get("id") === commentId);
  if (!comment) return;

  doc.transact(() => {
    comment.set("resolved", resolved);
    if (resolved) {
      comment.set("resolvedAt", Date.now());
      removeCommentMarks(doc, commentId);
    } else {
      comment.delete("resolvedAt");
    }
  }, "local");
}

export function addBlock(
  doc: Y.Doc,
  afterIndex?: number,
  type: WorkspaceBlockType = DEFAULT_BLOCK_TYPE,
  options: Partial<Pick<WorkspaceBlock, "indent" | "numbering" | "collapsed" | "url" | "caption" | "text">> = {},
): string {
  const blocks = getBlocksArray(doc);
  const insertIndex = afterIndex === undefined ? blocks.length : Math.min(blocks.length, afterIndex + 1);
  const id = createBlockId();

  doc.transact(() => {
    blocks.insert(insertIndex, [
      newBlockMap({
        id,
        text: options.text ?? "",
        type,
        indent: options.indent,
        numbering: options.numbering,
        collapsed: options.collapsed,
        url: options.url,
        caption: options.caption,
      }),
    ]);
  }, "local");

  return id;
}

export function importBlocks(
  doc: Y.Doc,
  importedBlocks: Array<Omit<WorkspaceBlock, "id"> & Partial<Pick<WorkspaceBlock, "id">>>,
  mode: "append" | "replace" = "append",
): string[] {
  const blocks = getBlocksArray(doc);
  const normalizedBlocks = importedBlocks.length > 0 ? importedBlocks : [{ text: "", type: DEFAULT_BLOCK_TYPE }];
  const ids = normalizedBlocks.map((block) => block.id ?? createBlockId());

  doc.transact(() => {
    if (mode === "replace" && blocks.length > 0) {
      blocks.delete(0, blocks.length);
    }

    blocks.push(
      normalizedBlocks.map((block, index) =>
        newBlockMap({
          id: ids[index],
          text: block.text ?? "",
          type: block.type ?? DEFAULT_BLOCK_TYPE,
          checked: block.checked,
          linkDisabled: block.linkDisabled,
          indent: block.indent,
          numbering: block.numbering,
          collapsed: block.collapsed,
          url: block.url,
          caption: block.caption,
          inlineMarks: block.inlineMarks,
        }),
      ),
    );
  }, "local");

  return ids;
}

export function duplicateBlock(doc: Y.Doc, blockId: string): string | undefined {
  const blocks = getBlocksArray(doc);
  const currentBlocks = readBlocks(doc);
  const index = currentBlocks.findIndex((block) => block.id === blockId);
  if (index < 0) return undefined;
  const source = currentBlocks[index];
  const id = createBlockId();

  doc.transact(() => {
    blocks.insert(index + 1, [newBlockMap({ ...source, id })]);
  }, "local");

  return id;
}

export function moveBlockToIndex(doc: Y.Doc, blockId: string, targetIndex: number): boolean {
  const blocks = getBlocksArray(doc);
  const currentBlocks = readBlocks(doc);
  const fromIndex = currentBlocks.findIndex((block) => block.id === blockId);
  if (fromIndex < 0 || currentBlocks.length <= 1) return false;

  const boundedTarget = Math.max(0, Math.min(currentBlocks.length, targetIndex));
  const adjustedTarget = fromIndex < boundedTarget ? boundedTarget - 1 : boundedTarget;
  if (fromIndex === adjustedTarget) return false;

  const movingBlock = currentBlocks[fromIndex];
  doc.transact(() => {
    blocks.delete(fromIndex, 1);
    blocks.insert(adjustedTarget, [newBlockMap(movingBlock)]);
  }, "local");

  return true;
}

export function removeBlock(doc: Y.Doc, blockId: string): boolean {
  const blocks = getBlocksArray(doc);
  const index = readBlocks(doc).findIndex((block) => block.id === blockId);
  if (index < 0 || blocks.length <= 1) return false;

  doc.transact(() => {
    blocks.delete(index, 1);
  }, "local");

  return true;
}

export function mergeBlockIntoPrevious(doc: Y.Doc, blockId: string): string | undefined {
  const blocks = getBlocksArray(doc);
  const currentBlocks = readBlocks(doc);
  const index = currentBlocks.findIndex((block) => block.id === blockId);
  if (index <= 0) return undefined;

  const previous = currentBlocks[index - 1];
  const current = currentBlocks[index];
  const previousMap = blocks.get(index - 1);

  doc.transact(() => {
    previousMap.set("text", `${previous.text}${current.text}`);
    blocks.delete(index, 1);
  }, "local");

  return previous.id;
}

export function applyPersistedState(doc: Y.Doc, snapshot: [] | [Uint8Array], updates: Uint8Array[]) {
  if (snapshot[0]) {
    Y.applyUpdate(doc, snapshot[0], "remote");
  }

  for (const update of updates) {
    Y.applyUpdate(doc, update, "remote");
  }
}

export function encodeSnapshot(doc: Y.Doc): Uint8Array {
  return Y.encodeStateAsUpdate(doc);
}

export function mergeUpdates(updates: Uint8Array[]): Uint8Array {
  return Y.mergeUpdates(updates);
}

function isWorkspaceBlockType(value: unknown): value is WorkspaceBlockType {
  return (
    value === "paragraph" ||
    value === "heading1" ||
    value === "heading2" ||
    value === "heading3" ||
    value === "bullet" ||
    value === "numbered" ||
    value === "checklist" ||
    value === "quote" ||
    value === "callout" ||
    value === "divider" ||
    value === "toggle" ||
    value === "image" ||
    value === "fileLink"
  );
}

function isWorkspaceNumberedListMode(value: unknown): value is WorkspaceNumberedListMode {
  return value === "restart" || value === "continue";
}
