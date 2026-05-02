import { describe, expect, it } from 'vitest';
import { Principal } from '@icp-sdk/core/principal';
import * as Y from 'yjs';
import { buildDocumentSearchResult, countQueryMatches } from '../../../frontend/src/workspace/documentSearch';
import { blocksToMarkdown } from '../../../frontend/src/workspace/markdownExport';
import { markdownToBlocks } from '../../../frontend/src/workspace/markdownImport';
import { computeNumberedListMarkers } from '../../../frontend/src/workspace/numberedLists';
import type { DocSummary, WorkspaceBlock } from '../../../frontend/src/workspace/types';
import {
  addBlock,
  applyPersistedState,
  encodeSnapshot,
  ensureInitialBlock,
  readBlocks,
  updateBlockText,
  updateBlockType,
} from '../../../frontend/src/workspace/yjsBlocks';

const owner = Principal.fromText('2vxsx-fae');

function doc(title: string): DocSummary {
  return {
    id: 1n,
    communityId: 0n,
    title,
    owner,
    createdAt: 1n,
    updatedAt: 2n,
    archived: false,
    version: 3n,
    role: { owner: null },
    communityShare: [],
    parentId: [],
  };
}

function block(text: string, extra: Partial<WorkspaceBlock> = {}): WorkspaceBlock {
  return {
    id: crypto.randomUUID(),
    text,
    type: 'paragraph',
    ...extra,
  };
}

function markerLabels(blocks: WorkspaceBlock[]): Record<string, string> {
  const computed = computeNumberedListMarkers(blocks);
  return Object.fromEntries(Object.entries(computed).map(([id, marker]) => [id, marker.label]));
}

describe('workspace helper utilities', () => {
  it('persists and restores Yjs document block state', () => {
    const yDoc = new Y.Doc();
    ensureInitialBlock(yDoc);
    const firstBlock = readBlocks(yDoc)[0];
    updateBlockText(yDoc, firstBlock.id, 'Opening paragraph');
    const secondId = addBlock(yDoc, 0, 'heading2');
    updateBlockText(yDoc, secondId, 'Next step');

    const snapshot = encodeSnapshot(yDoc);
    const restored = new Y.Doc();
    applyPersistedState(restored, [snapshot], []);

    expect(readBlocks(restored)).toMatchObject([
      { text: 'Opening paragraph', type: 'paragraph' },
      { id: secondId, text: 'Next step', type: 'heading2' },
    ]);
  });

  it('exports and imports core markdown block types with inline marks', () => {
    const markdown = blocksToMarkdown([
      { id: 'h', type: 'heading1', text: 'Plan' },
      { id: 'b', type: 'bullet', text: 'Point', indent: 1 },
      { id: 'c', type: 'checklist', text: 'Done', checked: true },
      {
        id: 'p',
        type: 'paragraph',
        text: 'Make this bold',
        inlineMarks: [{ id: 'bold', type: 'bold', start: 10, end: 14 }],
      },
    ]);

    expect(markdown).toContain('# Plan');
    expect(markdown).toContain('  - Point');
    expect(markdown).toContain('- [x] Done');
    expect(markdown).toContain('Make this **bold**');

    expect(markdownToBlocks('# Hello\n\n- **Bold item**')).toMatchObject([
      { type: 'heading1', text: 'Hello' },
      { type: 'bullet', text: 'Bold item', inlineMarks: [{ type: 'bold', start: 0, end: 9 }] },
    ]);
  });

  it('builds useful document search results', () => {
    const result = buildDocumentSearchResult(
      doc('DAO Plan'),
      [block('Calendar work'), block('Kanban boards and DAO collaboration', { caption: 'DAO screenshot' })],
      'dao',
    );

    expect(countQueryMatches('DAO dao daO', 'dao')).toBe(3);
    expect(result?.matchCount).toBe(3);
    expect(result?.titleMatches).toBe(1);
    expect(result?.contentMatches).toBe(2);
    expect(result?.snippet).toContain('Kanban boards');
  });

  it('computes nested and continued numbered list markers', () => {
    expect(
      markerLabels([
        { id: 'one', type: 'numbered', text: 'One' },
        { id: 'note', type: 'paragraph', text: 'Indented note', indent: 1 },
        { id: 'two', type: 'numbered', text: 'Two' },
        { id: 'child', type: 'numbered', text: 'Nested', indent: 1 },
        { id: 'break', type: 'heading2', text: 'Aside' },
        { id: 'continued', type: 'numbered', text: 'Continue', numbering: 'continue' },
        { id: 'restarted', type: 'numbered', text: 'Restart', numbering: 'restart' },
      ]),
    ).toEqual({
      one: '1.',
      two: '2.',
      child: 'a.',
      continued: '3.',
      restarted: '1.',
    });
  });

  it('normalizes non-numbered block metadata when block types change', () => {
    const yDoc = new Y.Doc();
    ensureInitialBlock(yDoc);
    const blockId = readBlocks(yDoc)[0].id;

    updateBlockType(yDoc, blockId, 'checklist', { checked: true });
    updateBlockText(yDoc, blockId, 'Ship the slice');
    updateBlockType(yDoc, blockId, 'paragraph');

    expect(readBlocks(yDoc)[0]).toMatchObject({
      id: blockId,
      type: 'paragraph',
      text: 'Ship the slice',
      checked: false,
    });
  });
});
