import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Principal } from '@dfinity/principal';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  FolderTree,
  GripVertical,
  Italic,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Redo2,
  Save,
  Search,
  Share2,
  Trash2,
  Undo2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CommunityAccess,
  CommunityDocumentPayload,
  CommunityDocumentSummary,
  CommunityMember,
  CommunityRole,
  WorkspaceRole,
} from '../../backend';
import {
  useAppendCommunityDocumentUpdate,
  useArchiveCommunityDocument,
  useCreateCommunityDocument,
  useGetCommunityDocument,
  useListCommunityDocuments,
  useListCommunityMembers,
  useRenameCommunityDocument,
  useSaveCommunityDocumentSnapshot,
  useSetCommunityDocumentGrant,
  useSetCommunityDocumentParent,
  useSetCommunityDocumentShare,
} from '../../hooks/useQueries';
import { useActor } from '../../hooks/useActor';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { useLocalePreference } from '../../i18n/preferences';
import { markdownToBlocks } from '../../workspace/markdownImport';
import { blocksToMarkdown } from '../../workspace/markdownExport';
import { buildDocumentSearchResult, type DocumentSearchResult } from '../../workspace/documentSearch';
import { readPinnedId, writePinnedId } from '../../workspace/pins';
import {
  addBlock,
  addBlockComment,
  applyInlineMark,
  applyPersistedState,
  duplicateBlock,
  encodeSnapshot,
  ensureInitialBlock,
  getBlocksArray,
  getCommentsArray,
  importBlocks,
  mergeBlockIntoPrevious,
  mergeUpdates,
  moveBlockToIndex,
  readBlocks,
  readComments,
  removeBlock,
  removeResolvedCommentMarks,
  setBlockCommentResolved,
  updateBlockChecked,
  updateBlockCollapsed,
  updateBlockIndent,
  updateBlockLinkDisabled,
  updateBlockMedia,
  updateBlockNumbering,
  updateBlockText,
  updateBlockType,
} from '../../workspace/yjsBlocks';
import {
  SLASH_COMMANDS,
  type BlockCommand,
  commandForBlockType,
  filterSlashCommands,
  firstValidHyperlink,
  isTextEditableBlock,
  linkifyText,
  markdownShortcutForText,
  nextBlockTypeAfterEnter,
  slashQueryForText,
} from '../../workspace/editorCommands';
import { computeNumberedListMarkers } from '../../workspace/numberedLists';
import type {
  DocSummary as SearchDocSummary,
  WorkspaceBlock,
  WorkspaceBlockType,
  WorkspaceComment,
  WorkspaceHighlightColor,
  WorkspaceNumberedListMode,
  WorkspaceRole as SearchWorkspaceRole,
  WorkspaceTextMark,
  WorkspaceTextMarkType,
} from '../../workspace/types';
import {
  canEditWorkspaceRole,
  canOwnWorkspaceRole,
  compactPrincipal,
  downloadJson,
  downloadText,
  readableDate,
  roleName,
  roleVariant,
  sortDocs,
} from '../../workspace/workspaceApi';
import LoadingSpinner from '../LoadingSpinner';
import { DocumentEditor as SplitDocumentEditor } from './DocumentEditor';
import { DocumentLibrarySidebar as SplitDocumentLibrarySidebar } from './DocumentLibrarySidebar';

const ROOT_DROP_ID = 'workspace-doc-root';
const NANOS_PER_MILLI = BigInt(1_000_000);

type SyncStatus = 'Loaded' | 'Unsaved changes' | 'Saving' | 'Persisted' | 'Save error' | 'Compacting' | 'Compacted' | 'Compact error' | 'Title saved';
type SidebarSection = 'mine' | 'workspace' | 'shared';
type DropTarget = { type: 'root' } | { type: 'doc'; docId: string };
type SelectionState = { blockId: string; start: number; end: number; text: string; menuPosition?: { left: number; top: number } };
type DocNode = CommunityDocumentSummary & { children: DocNode[] };
const COMMAND_GROUPS: Array<BlockCommand['group']> = ['Text', 'Lists', 'Structure', 'Media'];

interface CommunityDocumentsWorkspaceProps {
  access: CommunityAccess;
  communityId: bigint;
  communityName: string;
  initialDocumentId?: bigint;
  onOpenDocumentRoute?: (documentId: bigint) => void;
}

function roleObject(role: WorkspaceRole): SearchWorkspaceRole {
  return { [roleName(role)]: null } as SearchWorkspaceRole;
}

function commandGroups(commands: BlockCommand[]) {
  return COMMAND_GROUPS
    .map((group) => ({ group, commands: commands.filter((command) => command.group === group) }))
    .filter(({ commands }) => commands.length > 0);
}

function selectionFromTextarea(blockId: string, element: HTMLTextAreaElement): SelectionState | undefined {
  if (element.selectionStart === element.selectionEnd) return undefined;

  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
  const fontSize = Number.parseFloat(styles.fontSize) || 16;
  const beforeSelection = element.value.slice(0, element.selectionStart);
  const selectedText = element.value.slice(element.selectionStart, element.selectionEnd);
  const currentLine = beforeSelection.slice(beforeSelection.lastIndexOf('\n') + 1);
  const approximateTextOffset = currentLine.length * fontSize * 0.45 + Math.min(selectedText.length * fontSize * 0.22, 120);
  const lineIndex = beforeSelection.split('\n').length - 1;
  const left = Math.min(window.innerWidth - 24, Math.max(24, rect.left + approximateTextOffset));
  const top = Math.max(12, rect.top + lineIndex * lineHeight - 44);

  return {
    blockId,
    start: element.selectionStart,
    end: element.selectionEnd,
    text: selectedText,
    menuPosition: { left, top },
  };
}

function toSearchDoc(doc: CommunityDocumentSummary): SearchDocSummary {
  return {
    id: doc.id,
    communityId: doc.communityId,
    title: doc.title,
    owner: doc.owner,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    archived: doc.archived,
    version: doc.version,
    role: roleObject(doc.role),
    communityShare: doc.communityShare ? [roleObject(doc.communityShare)] : [],
    parentId: doc.parentId === null ? [] : [doc.parentId],
  };
}

function docDragId(docId: bigint): string {
  return `doc:${docId.toString()}`;
}

function parseDocDragId(value: string): bigint | undefined {
  if (!value.startsWith('doc:')) return undefined;
  try {
    return BigInt(value.slice(4));
  } catch {
    return undefined;
  }
}

function sortMembers(members: CommunityMember[] | undefined): CommunityMember[] {
  return [...(members ?? [])].sort((a, b) => {
    const left = a.profile?.name ?? a.principal.toText();
    const right = b.profile?.name ?? b.principal.toText();
    return left.localeCompare(right);
  });
}

function buildDocTree(docs: CommunityDocumentSummary[]): DocNode[] {
  const byId = new Map<string, DocNode>();
  const roots: DocNode[] = [];
  for (const doc of docs) {
    byId.set(doc.id.toString(), { ...doc, children: [] });
  }
  for (const node of byId.values()) {
    const parent = node.parentId === null ? undefined : byId.get(node.parentId.toString());
    if (parent && parent.id !== node.id) parent.children.push(node);
    else roots.push(node);
  }
  const sortTree = (nodes: DocNode[]) => {
    nodes.sort((a, b) => Number(b.updatedAt - a.updatedAt));
    nodes.forEach((node) => sortTree(node.children));
  };
  sortTree(roots);
  return roots;
}

function buildDescendantMap(nodes: DocNode[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  function walk(node: DocNode): Set<string> {
    const descendants = new Set<string>();
    for (const child of node.children) {
      descendants.add(child.id.toString());
      for (const nested of walk(child)) descendants.add(nested);
    }
    map.set(node.id.toString(), descendants);
    return descendants;
  }
  nodes.forEach(walk);
  return map;
}

function safeTitle(value: string): string {
  return value.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'workspace-doc';
}

function plainBlockText(block: WorkspaceBlock): string {
  return [block.text, block.caption, block.url].filter(Boolean).join(' ');
}

function selectedRoleLabel(role: WorkspaceRole, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`workspace.roles.${roleName(role)}`);
}

function selectedShareLabel(role: WorkspaceRole | null, t: ReturnType<typeof useTranslation>['t']): string {
  if (role === null) return t('workspace.share.private');
  if (role === WorkspaceRole.editor) return t('workspace.share.communityEditor');
  return t('workspace.share.communityViewer');
}

function isBlockHiddenByCollapsedToggle(blocks: WorkspaceBlock[], index: number): boolean {
  const block = blocks[index];
  if (!block) return false;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = blocks[cursor];
    if (!candidate) continue;
    if ((candidate.indent ?? 0) < (block.indent ?? 0)) {
      if (candidate.type === 'toggle' && candidate.collapsed) return true;
    }
  }
  return false;
}

function renderMarkedText(text: string, marks: WorkspaceTextMark[] = []) {
  if (marks.length === 0) return linkifyText(text).map((segment, index) => segment.href ? (
    <a key={`${segment.href}-${index}`} href={segment.href} target="_blank" rel="noreferrer" className="text-amnesty-blue underline">
      {segment.text}
    </a>
  ) : segment.text);

  const boundaries = new Set<number>([0, text.length]);
  marks.forEach((mark) => {
    boundaries.add(Math.max(0, Math.min(text.length, mark.start)));
    boundaries.add(Math.max(0, Math.min(text.length, mark.end)));
  });

  const sorted = [...boundaries].sort((a, b) => a - b);
  return sorted.flatMap((start, index) => {
    const end = sorted[index + 1];
    if (end === undefined || end <= start) return [];
    let node: React.ReactNode = text.slice(start, end);
    for (const mark of marks.filter((candidate) => candidate.start < end && candidate.end > start)) {
      if (mark.type === 'bold') node = <strong key={`${mark.id}-bold-${start}`}>{node}</strong>;
      if (mark.type === 'italic') node = <em key={`${mark.id}-italic-${start}`}>{node}</em>;
      if (mark.type === 'highlight') {
        node = (
          <mark key={`${mark.id}-highlight-${start}`} data-highlight-color={mark.color ?? 'yellow'}>
            {node}
          </mark>
        );
      }
      if (mark.type === 'comment') {
        node = (
          <span key={`${mark.id}-comment-${start}`} className="inline-comment-mark">
            {node}
          </span>
        );
      }
    }
    return <React.Fragment key={`${start}-${end}`}>{node}</React.Fragment>;
  });
}

export default function CommunityDocumentsWorkspace({
  access,
  communityId,
  communityName,
  initialDocumentId,
  onOpenDocumentRoute,
}: CommunityDocumentsWorkspaceProps) {
  const { t } = useTranslation();
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const { locale } = useLocalePreference();
  const principal = identity?.getPrincipal().toText();
  const [selectedDocumentId, setSelectedDocumentId] = useState<bigint | null>(initialDocumentId ?? null);
  const [newTitle, setNewTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>([]);
  const [comments, setComments] = useState<WorkspaceComment[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('Loaded');
  const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false });
  const [focusRequest, setFocusRequest] = useState<{ id: string; nonce: number }>();
  const [pinnedDocumentId, setPinnedDocumentId] = useState<bigint | undefined>(() => readPinnedId('workspace-doc', principal));

  const yDocRef = useRef<Y.Doc>();
  const selectedDocRef = useRef<CommunityDocumentPayload | null>(null);
  const undoManagerRef = useRef<Y.UndoManager>();
  const pendingUpdatesRef = useRef<Uint8Array[]>([]);
  const flushTimerRef = useRef<number>();
  const focusNonceRef = useRef(0);
  const openedInitialDocRef = useRef<string>();
  const openedPinnedDocRef = useRef<string>();
  const hydratedDocumentKeyRef = useRef<string>();

  const createDocument = useCreateCommunityDocument();
  const renameDocument = useRenameCommunityDocument();
  const appendUpdate = useAppendCommunityDocumentUpdate();
  const appendUpdateRef = useRef(appendUpdate);
  const saveSnapshot = useSaveCommunityDocumentSnapshot();
  const setShare = useSetCommunityDocumentShare();
  const setGrant = useSetCommunityDocumentGrant();
  const setParent = useSetCommunityDocumentParent();
  const archiveDocument = useArchiveCommunityDocument();
  const { data: documents, isLoading: documentsLoading } = useListCommunityDocuments(communityId);
  const { data: members } = useListCommunityMembers(communityId);
  const { data: selectedDocument, isLoading: selectedLoading } = useGetCommunityDocument(communityId, selectedDocumentId);

  useEffect(() => {
    appendUpdateRef.current = appendUpdate;
  }, [appendUpdate]);

  const canUseWorkspace = access.isPlatformAdmin || access.communityRole !== null;
  const canCreateDocuments = canUseWorkspace;
  const canManageCommunityWorkspace = access.isPlatformAdmin || access.communityRole === CommunityRole.communityAdmin;
  const sortedDocuments = useMemo(() => sortDocs(documents ?? []), [documents]);
  const ownedDocuments = useMemo(() => sortedDocuments.filter((doc) => doc.role === WorkspaceRole.owner), [sortedDocuments]);
  const workspaceDocuments = useMemo(() => sortedDocuments.filter((doc) => doc.communityShare !== null), [sortedDocuments]);
  const sharedDocuments = useMemo(
    () => sortedDocuments.filter((doc) => doc.role !== WorkspaceRole.owner && doc.communityShare === null),
    [sortedDocuments],
  );
  const parentOptions = useMemo(
    () => ownedDocuments.filter((doc) => doc.id !== selectedDocumentId),
    [ownedDocuments, selectedDocumentId],
  );

  const updateUndoAvailability = useCallback((manager = undoManagerRef.current) => {
    const nextUndoState = {
      canUndo: Boolean(manager && manager.undoStack.length > 0),
      canRedo: Boolean(manager && manager.redoStack.length > 0),
    };

    setUndoState((currentUndoState) => (
      currentUndoState.canUndo === nextUndoState.canUndo && currentUndoState.canRedo === nextUndoState.canRedo
        ? currentUndoState
        : nextUndoState
    ));
  }, []);

  const requestBlockFocus = useCallback((blockId?: string) => {
    if (!blockId) {
      setFocusRequest(undefined);
      return;
    }
    focusNonceRef.current += 1;
    setFocusRequest({ id: blockId, nonce: focusNonceRef.current });
  }, []);

  const flushPendingUpdates = useCallback(async () => {
    const payload = selectedDocRef.current;
    if (!payload || pendingUpdatesRef.current.length === 0) {
      if (payload) setSyncStatus('Persisted');
      return;
    }

    const updates = pendingUpdatesRef.current.splice(0);
    const merged = mergeUpdates(updates);
    setSyncStatus('Saving');
    try {
      const version = await appendUpdateRef.current.mutateAsync({ communityId, documentId: payload.id, update: merged });
      const updatedPayload = {
        ...payload,
        version,
        updates: [...payload.updates, merged],
      };
      selectedDocRef.current = updatedPayload;
      setSyncStatus('Persisted');
    } catch (error) {
      pendingUpdatesRef.current = [...updates, ...pendingUpdatesRef.current];
      setSyncStatus('Save error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }, [communityId]);

  const queueUpdate = useCallback((update: Uint8Array) => {
    pendingUpdatesRef.current.push(update);
    setSyncStatus('Unsaved changes');
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      void flushPendingUpdates();
    }, 800);
  }, [flushPendingUpdates]);

  const hydrateDocument = useCallback((payload: CommunityDocumentPayload) => {
    if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
    pendingUpdatesRef.current = [];
    undoManagerRef.current?.destroy();
    undoManagerRef.current = undefined;
    updateUndoAvailability(undefined);
    yDocRef.current?.destroy();

    const doc = new Y.Doc();
    applyPersistedState(doc, payload.snapshot ? [payload.snapshot] : [], payload.updates);
    removeResolvedCommentMarks(doc);
    ensureInitialBlock(doc);

    doc.on('update', (update, origin) => {
      setBlocks(readBlocks(doc));
      setComments(readComments(doc));
      updateUndoAvailability();
      if (origin === 'local' || origin === undoManagerRef.current) {
        queueUpdate(update);
      }
    });

    yDocRef.current = doc;
    selectedDocRef.current = payload;
    const undoManager = new Y.UndoManager([getBlocksArray(doc), getCommentsArray(doc)], {
      trackedOrigins: new Set(['local']),
    });
    undoManager.on('stack-item-added', () => updateUndoAvailability(undoManager));
    undoManager.on('stack-item-popped', () => updateUndoAvailability(undoManager));
    undoManager.on('stack-item-updated', () => updateUndoAvailability(undoManager));
    undoManager.clear();
    undoManagerRef.current = undoManager;
    updateUndoAvailability(undoManager);
    const nextBlocks = readBlocks(doc);
    setBlocks(nextBlocks);
    setComments(readComments(doc));
    setSyncStatus('Loaded');
    requestBlockFocus(nextBlocks[0]?.id);
  }, [queueUpdate, requestBlockFocus, updateUndoAvailability]);

  useEffect(() => {
    setPinnedDocumentId(readPinnedId('workspace-doc', principal));
  }, [principal]);

  useEffect(() => {
    if (initialDocumentId === undefined) return;
    const key = initialDocumentId.toString();
    if (openedInitialDocRef.current === key) return;
    openedInitialDocRef.current = key;
    setSelectedDocumentId(initialDocumentId);
  }, [initialDocumentId]);

  useEffect(() => {
    if (selectedDocumentId !== null || pinnedDocumentId === undefined) return;
    const key = pinnedDocumentId.toString();
    if (openedPinnedDocRef.current === key) return;
    openedPinnedDocRef.current = key;
    setSelectedDocumentId(pinnedDocumentId);
  }, [pinnedDocumentId, selectedDocumentId]);

  useEffect(() => {
    if (selectedDocumentId !== null || sortedDocuments.length === 0) return;
    setSelectedDocumentId(sortedDocuments[0].id);
  }, [selectedDocumentId, sortedDocuments]);

  useEffect(() => {
    if (!selectedDocument) {
      hydratedDocumentKeyRef.current = undefined;
      return;
    }

    const hydrationKey = `${selectedDocument.id.toString()}:${selectedDocument.version.toString()}`;
    const openPayload = selectedDocRef.current;
    const openDoc = yDocRef.current;
    if (openPayload && openDoc && openPayload.id === selectedDocument.id) {
      const missingUpdates = selectedDocument.updates.slice(openPayload.updates.length);
      if (selectedDocument.version >= openPayload.version && missingUpdates.length > 0) {
        applyPersistedState(openDoc, [], missingUpdates);
      }
      selectedDocRef.current = selectedDocument.version >= openPayload.version ? selectedDocument : openPayload;
      hydratedDocumentKeyRef.current = hydrationKey;
      return;
    }

    if (hydratedDocumentKeyRef.current === hydrationKey) return;
    hydratedDocumentKeyRef.current = hydrationKey;
    hydrateDocument(selectedDocument);
  }, [hydrateDocument, selectedDocument]);

  useEffect(() => {
    if (selectedDocument !== null || selectedDocumentId === null || pinnedDocumentId !== selectedDocumentId) return;
    setPinnedDocumentId(writePinnedId('workspace-doc', principal, undefined));
    setSelectedDocumentId(null);
    setMessage('The pinned document is no longer available, so the default workspace document was cleared.');
  }, [pinnedDocumentId, principal, selectedDocument, selectedDocumentId]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      undoManagerRef.current?.destroy();
      yDocRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!actor || query.length < 2 || sortedDocuments.length === 0) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      Promise.all(
        sortedDocuments.map(async (doc) => {
          if (doc.id === selectedDocumentId && selectedDocRef.current) {
            return buildDocumentSearchResult(toSearchDoc(doc), blocks, query);
          }
          const payload = await actor.getCommunityDocument(communityId, doc.id);
          if (!payload) return undefined;
          const searchDoc = new Y.Doc();
          try {
            applyPersistedState(searchDoc, payload.snapshot ? [payload.snapshot] : [], payload.updates);
            return buildDocumentSearchResult(toSearchDoc(doc), readBlocks(searchDoc), query);
          } finally {
            searchDoc.destroy();
          }
        }),
      )
        .then((results) => {
          if (cancelled) return;
          setSearchResults(
            results
              .filter((result): result is DocumentSearchResult => Boolean(result))
              .sort((a, b) => b.matchCount - a.matchCount || Number(b.doc.updatedAt - a.doc.updatedAt)),
          );
        })
        .catch((error) => {
          if (!cancelled) setMessage(error instanceof Error ? error.message : String(error));
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 240);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [actor, blocks, communityId, searchQuery, selectedDocumentId, sortedDocuments]);

  const openDocument = async (documentId: bigint) => {
    await flushPendingUpdates();
    setSelectedDocumentId(documentId);
    setMessage(null);
    onOpenDocumentRoute?.(documentId);
  };

  const createNewDocument = async () => {
    const title = newTitle.trim();
    if (!title || !canCreateDocuments) return;
    setMessage(null);
    try {
      const documentId = await createDocument.mutateAsync({ communityId, title });
      setNewTitle('');
      await openDocument(documentId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const renameSelectedDocument = async (title: string) => {
    const payload = selectedDocRef.current;
    if (!payload || !canEditWorkspaceRole(payload.role)) return;
    const nextTitle = title.trim();
    if (!nextTitle || nextTitle === payload.title) return;
    setMessage(null);
    try {
      await renameDocument.mutateAsync({ communityId, documentId: payload.id, title: nextTitle });
      selectedDocRef.current = { ...payload, title: nextTitle };
      setSyncStatus('Title saved');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const insertBlock = (afterIndex?: number, type: WorkspaceBlockType = 'paragraph', options: { indent?: number; url?: string; caption?: string; text?: string } = {}) => {
    const doc = yDocRef.current;
    const payload = selectedDocRef.current;
    if (!doc || !payload || !canEditWorkspaceRole(payload.role)) return undefined;
    const id = addBlock(doc, afterIndex, type, options);
    requestBlockFocus(id);
    return id;
  };

  const updateText = (blockId: string, text: string) => {
    const doc = yDocRef.current;
    const payload = selectedDocRef.current;
    if (!doc || !payload || !canEditWorkspaceRole(payload.role)) return;
    updateBlockText(doc, blockId, text);
    const shortcut = markdownShortcutForText(text);
    if (shortcut) {
      updateBlockType(doc, blockId, shortcut.type, { text: shortcut.text, checked: shortcut.checked });
    }
  };

  const compactSnapshot = async () => {
    const doc = yDocRef.current;
    const payload = selectedDocRef.current;
    if (!doc || !payload || !canEditWorkspaceRole(payload.role)) return;
    setMessage(null);
    await flushPendingUpdates();
    const latestPayload = selectedDocRef.current;
    if (!latestPayload) return;
    try {
      setSyncStatus('Compacting');
      await saveSnapshot.mutateAsync({
        communityId,
        documentId: latestPayload.id,
        snapshot: encodeSnapshot(doc),
        compactThroughVersion: latestPayload.version,
      });
      setSyncStatus('Compacted');
    } catch (error) {
      setSyncStatus('Compact error');
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const importMarkdownFile = async (file: File) => {
    const doc = yDocRef.current;
    const payload = selectedDocRef.current;
    if (!doc || !payload || !canEditWorkspaceRole(payload.role)) return;
    const markdown = await file.text();
    const imported = markdownToBlocks(markdown);
    const currentBlocks = readBlocks(doc);
    const replace =
      currentBlocks.length === 1 &&
      currentBlocks[0].type === 'paragraph' &&
      currentBlocks[0].text.trim().length === 0 &&
      (currentBlocks[0].inlineMarks?.length ?? 0) === 0;
    const ids = importBlocks(doc, imported, replace ? 'replace' : 'append');
    requestBlockFocus(ids[0]);
    setMessage(`Imported ${ids.length} Markdown block${ids.length === 1 ? '' : 's'}.`);
  };

  const setDocumentParent = async (documentId: bigint, parentId: bigint | null) => {
    try {
      await setParent.mutateAsync({ communityId, documentId, parentId });
      if (selectedDocRef.current?.id === documentId) {
        selectedDocRef.current = { ...selectedDocRef.current, parentId };
      }
      setMessage(parentId === null ? 'Document moved to top level.' : 'Document nested under parent.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const togglePinnedDocument = () => {
    const payload = selectedDocRef.current;
    if (!payload) return;
    const nextPinned = pinnedDocumentId === payload.id ? undefined : payload.id;
    setPinnedDocumentId(writePinnedId('workspace-doc', principal, nextPinned));
    if (nextPinned) onOpenDocumentRoute?.(nextPinned);
    setMessage(nextPinned ? 'This document will open by default.' : 'Default workspace document cleared.');
  };

  const selectedEditable = canEditWorkspaceRole(selectedDocument?.role);
  const selectedOwner = canOwnWorkspaceRole(selectedDocument?.role) || canManageCommunityWorkspace;

  if (!canUseWorkspace) {
    return (
      <section className="amnesty-panel bg-white p-8 md:p-10">
        <p className="amnesty-kicker text-amnesty-blue mb-4">{t('workspace.kicker')}</p>
        <h1 className="text-5xl text-amnesty-ink amnesty-heading">{t('workspace.viewerLockedTitle')}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">{t('workspace.viewerLockedBody')}</p>
      </section>
    );
  }

  return (
    <section className="workspace-app community-doc-workspace-app" aria-label={t('workspace.kicker')}>
      <div className="workspace-page-shell community-workspace-page-shell">
      <SplitDocumentLibrarySidebar
        canCreateDocuments={canCreateDocuments}
        documentsLoading={documentsLoading}
        members={members}
        newTitle={newTitle}
        onCreateDocument={() => void createNewDocument()}
        onNewTitleChange={setNewTitle}
        onOpenDocument={(documentId) => void openDocument(documentId)}
        onSearchQueryChange={setSearchQuery}
        onSetDocumentParent={(documentId, parentId) => void setDocumentParent(documentId, parentId)}
        ownedDocuments={ownedDocuments}
        searchLoading={searchLoading}
        searchQuery={searchQuery}
        searchResults={searchResults}
        selectedDocumentId={selectedDocumentId}
        sharedDocuments={sharedDocuments}
        workspaceDocuments={workspaceDocuments}
      />

        <div className="community-doc-main">
          <div className="workspace-hero workspace-hero-docs">
            <div>
              <div className="kicker page-kicker amnesty-kicker">{t('app.nav.workspace')}</div>
              <h1>{t('workspace.pageTitle')}</h1>
              <p>{t('workspace.pageBody')}</p>
            </div>
          </div>

          <SplitDocumentEditor
            blocks={blocks}
            canManageCommunityWorkspace={canManageCommunityWorkspace}
            comments={comments}
            communityName={communityName}
            focusRequest={focusRequest}
            isPinned={selectedDocument ? pinnedDocumentId === selectedDocument.id : false}
            loading={selectedLoading}
            locale={locale}
            members={members}
            message={message}
            onAddBlock={(afterIndex, type, options) => insertBlock(afterIndex, type, options)}
            onArchive={async () => {
              if (!selectedDocument || !selectedOwner) return;
              await archiveDocument.mutateAsync({ communityId, documentId: selectedDocument.id });
              if (pinnedDocumentId === selectedDocument.id) setPinnedDocumentId(writePinnedId('workspace-doc', principal, undefined));
              setSelectedDocumentId(null);
              setBlocks([]);
              setComments([]);
            }}
            onBlockChecked={(blockId, checked) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) updateBlockChecked(doc, blockId, checked);
            }}
            onBlockCollapsed={(blockId, collapsed) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) updateBlockCollapsed(doc, blockId, collapsed);
            }}
            onBlockIndent={(blockId, delta) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) updateBlockIndent(doc, blockId, delta);
            }}
            onBlockLinkToggle={(blockId, disabled) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) updateBlockLinkDisabled(doc, blockId, disabled);
            }}
            onBlockMedia={(blockId, fields) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) updateBlockMedia(doc, blockId, fields);
            }}
            onBlockMove={(blockId, targetIndex) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable && moveBlockToIndex(doc, blockId, targetIndex)) requestBlockFocus(blockId);
            }}
            onBlockNumbering={(blockId, mode) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) updateBlockNumbering(doc, blockId, mode);
            }}
            onBlockRemove={(blockId) => {
              const doc = yDocRef.current;
              if (!doc || !selectedEditable) return;
              const currentBlocks = readBlocks(doc);
              const index = currentBlocks.findIndex((block) => block.id === blockId);
              const fallback = currentBlocks[index - 1]?.id ?? currentBlocks[index + 1]?.id;
              if (removeBlock(doc, blockId)) requestBlockFocus(fallback);
            }}
            onBlockText={updateText}
            onBlockType={(blockId, type) => {
              const doc = yDocRef.current;
              if (!doc || !selectedEditable) return;
              const currentBlock = readBlocks(doc).find((block) => block.id === blockId);
              updateBlockType(doc, blockId, type, {
                text: type === 'divider' ? '' : undefined,
                url: type === 'image' || type === 'fileLink' ? currentBlock?.url || firstValidHyperlink(currentBlock?.text ?? '') : undefined,
              });
              requestBlockFocus(blockId);
            }}
            onComment={(blockId, text, selection) => {
              const doc = yDocRef.current;
              if (!doc || !selectedEditable) return;
              addBlockComment(doc, {
                blockId,
                text,
                author: principal ?? 'unknown',
                createdAt: Date.now(),
                selectedText: selection?.text,
                selectionStart: selection?.start,
                selectionEnd: selection?.end,
                commentScope: selection ? 'inline' : 'block',
                markedRanges:
                  selection?.markedRanges ??
                  (selection ? [{ blockId, selectedText: selection.text, selectionStart: selection.start, selectionEnd: selection.end }] : undefined),
              });
            }}
            onCompact={() => void compactSnapshot()}
            onDuplicateBlock={(blockId) => {
              const doc = yDocRef.current;
              if (!doc || !selectedEditable) return;
              const id = duplicateBlock(doc, blockId);
              if (id) requestBlockFocus(id);
            }}
            onExportJson={() => {
              if (!selectedDocument) return;
              downloadJson(`amnesty-workspace-doc-${selectedDocument.id.toString()}.json`, {
                schemaVersion: 'amnesty-community-workspace-doc-debug-v1',
                notice: 'Saved workspace documents contain opaque Yjs update blobs and optional snapshots.',
                document: selectedDocument,
                blocks,
                comments,
              });
            }}
            onExportMarkdown={() => {
              if (!selectedDocument) return;
              downloadText(`${safeTitle(selectedDocument.title)}.md`, blocksToMarkdown(blocks), 'text/markdown');
            }}
            onGrantAccess={async (user, role) => {
              if (!selectedDocument || !selectedOwner) return;
              await setGrant.mutateAsync({ communityId, documentId: selectedDocument.id, user, role });
              setMessage(role === null ? 'Direct access revoked.' : `Granted ${roleName(role)} access.`);
            }}
            onImportMarkdown={(file) => void importMarkdownFile(file)}
            onInlineFormat={(blockId, type, start, end, color) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) applyInlineMark(doc, blockId, type, start, end, { color });
            }}
            onMarkdownShortcut={(blockId, shortcut) => {
              const doc = yDocRef.current;
              if (!doc || !selectedEditable) return;
              updateBlockType(doc, blockId, shortcut.type, {
                checked: shortcut.checked,
                text: shortcut.text,
              });
              requestBlockFocus(blockId);
            }}
            onMergeBlock={(blockId) => {
              const doc = yDocRef.current;
              if (!doc || !selectedEditable) return undefined;
              const id = mergeBlockIntoPrevious(doc, blockId);
              if (id) requestBlockFocus(id);
              return id;
            }}
            onParentChange={(parentId) => {
              if (!selectedDocument || !selectedOwner) return;
              void setDocumentParent(selectedDocument.id, parentId);
            }}
            onRedo={() => {
              const manager = undoManagerRef.current;
              if (manager && selectedEditable) {
                manager.redo();
                updateUndoAvailability(manager);
              }
            }}
            onRename={(title) => void renameSelectedDocument(title)}
            onRequestBlockFocus={(blockId) => requestBlockFocus(blockId)}
            onResolveComment={(commentId, resolved) => {
              const doc = yDocRef.current;
              if (doc && selectedEditable) setBlockCommentResolved(doc, commentId, resolved);
            }}
            onSetShare={async (role) => {
              if (!selectedDocument || !selectedOwner) return;
              await setShare.mutateAsync({ communityId, documentId: selectedDocument.id, role });
              setMessage(role === null ? 'Document removed from community sharing.' : `Community members now have ${roleName(role)} access.`);
            }}
            onSync={() => void flushPendingUpdates()}
            onTogglePinned={togglePinnedDocument}
            onUndo={() => {
              const manager = undoManagerRef.current;
              if (manager && selectedEditable) {
                manager.undo();
                updateUndoAvailability(manager);
              }
            }}
            parentOptions={parentOptions}
            requestedDocumentId={selectedDocumentId}
            selectedDocument={selectedDocument}
            syncStatus={syncStatus}
            undoState={undoState}
          />
        </div>
      </div>
    </section>
  );
}

interface DocumentLibrarySidebarProps {
  canCreateDocuments: boolean;
  documentsLoading: boolean;
  members: CommunityMember[] | undefined;
  newTitle: string;
  onCreateDocument: () => void;
  onNewTitleChange: (title: string) => void;
  onOpenDocument: (documentId: bigint) => void;
  onSearchQueryChange: (query: string) => void;
  onSetDocumentParent: (documentId: bigint, parentId: bigint | null) => void;
  ownedDocuments: CommunityDocumentSummary[];
  searchLoading: boolean;
  searchQuery: string;
  searchResults: DocumentSearchResult[];
  selectedDocumentId: bigint | null;
  sharedDocuments: CommunityDocumentSummary[];
  workspaceDocuments: CommunityDocumentSummary[];
}

function DocumentLibrarySidebar({
  canCreateDocuments,
  documentsLoading,
  members,
  newTitle,
  onCreateDocument,
  onNewTitleChange,
  onOpenDocument,
  onSearchQueryChange,
  onSetDocumentParent,
  ownedDocuments,
  searchLoading,
  searchQuery,
  searchResults,
  selectedDocumentId,
  sharedDocuments,
  workspaceDocuments,
}: DocumentLibrarySidebarProps) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const [collapsedSections, setCollapsedSections] = useState<Record<SidebarSection, boolean>>({
    mine: false,
    workspace: false,
    shared: false,
  });
  const [collapsedDocs, setCollapsedDocs] = useState<Set<string>>(() => new Set());
  const [dropTarget, setDropTarget] = useState<DropTarget>();
  const [searchFocused, setSearchFocused] = useState(false);
  const ownedTree = useMemo(() => buildDocTree(ownedDocuments), [ownedDocuments]);
  const descendantMap = useMemo(() => buildDescendantMap(ownedTree), [ownedTree]);
  const canDragDocs = searchQuery.trim().length === 0;
  const showSearchResults = searchFocused && searchQuery.trim().length >= 2;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const toggleDoc = (docId: bigint) => {
    setCollapsedDocs((current) => {
      const next = new Set(current);
      const key = docId.toString();
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDragOver = (event: DragOverEvent) => {
    const activeDocId = parseDocDragId(String(event.active.id));
    if (activeDocId === undefined) return;
    const overId = event.over?.id ? String(event.over.id) : undefined;
    if (!overId) {
      setDropTarget(undefined);
      return;
    }
    if (overId === ROOT_DROP_ID) {
      setDropTarget({ type: 'root' });
      return;
    }
    const targetDocId = parseDocDragId(overId);
    if (targetDocId === undefined || targetDocId === activeDocId) {
      setDropTarget(undefined);
      return;
    }
    const descendants = descendantMap.get(activeDocId.toString());
    if (descendants?.has(targetDocId.toString())) {
      setDropTarget(undefined);
      return;
    }
    setDropTarget({ type: 'doc', docId: targetDocId.toString() });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeDocId = parseDocDragId(String(event.active.id));
    const overId = event.over?.id ? String(event.over.id) : undefined;
    setDropTarget(undefined);
    if (activeDocId === undefined || !overId) return;
    if (overId === ROOT_DROP_ID) {
      onSetDocumentParent(activeDocId, null);
      return;
    }
    const targetDocId = parseDocDragId(overId);
    if (targetDocId === undefined || targetDocId === activeDocId) return;
    const descendants = descendantMap.get(activeDocId.toString());
    if (descendants?.has(targetDocId.toString())) return;
    onSetDocumentParent(activeDocId, targetDocId);
  };

  return (
    <aside className="document-sidebar community-doc-sidebar" aria-label={t('workspace.documents.sidebarTitle')}>
      <div className="workspace-create compact-create">
        <p className="sidebar-title">{t('app.nav.workspace')}</p>
          <input
            aria-label={t('workspace.documents.newPlaceholder')}
            disabled={!canCreateDocuments}
            onChange={(event) => onNewTitleChange(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onCreateDocument();
            }}
            placeholder={t('workspace.documents.newPlaceholder')}
            value={newTitle}
          />
          <button
            className="cta workspace-create-button"
            disabled={!canCreateDocuments || newTitle.trim().length === 0}
            onClick={onCreateDocument}
            type="button"
          >
            <Plus size={17} />
            {t('common.actions.create')}
          </button>
      </div>

      <div className="workspace-search">
        <label className="sidebar-search">
          <Search size={16} />
          <input
            aria-label={t('workspace.search.placeholder')}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 140)}
            onChange={(event) => onSearchQueryChange(event.currentTarget.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder={t('workspace.search.placeholder')}
            value={searchQuery}
          />
        </label>
        {showSearchResults && (
          <div className="workspace-search-results">
            {searchLoading && <p className="sidebar-empty">{t('workspace.search.loading')}</p>}
            {!searchLoading && searchResults.length === 0 && <p className="sidebar-empty">{t('workspace.search.empty')}</p>}
            {!searchLoading && searchResults.map((result) => (
              <button
                key={result.doc.id.toString()}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onOpenDocument(result.doc.id);
                  setSearchFocused(false);
                }}
                className="workspace-search-result"
              >
                <strong>{result.doc.title}</strong>
                <span>{t('workspace.search.matches', { count: result.matchCount })}</span>
                <small>{result.snippet}</small>
              </button>
            ))}
          </div>
        )}
      </div>

      {documentsLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd} onDragOver={handleDragOver} onDragCancel={() => setDropTarget(undefined)} sensors={sensors}>
          <SidebarSectionList
            canReparent={canDragDocs}
            collapsed={collapsedSections.mine}
            collapsedDocs={collapsedDocs}
            count={ownedDocuments.length}
            docs={ownedDocuments}
            dropTarget={dropTarget}
            emptyText={t('workspace.documents.emptyMine')}
            icon={<FolderTree size={16} />}
            isRootDropTarget={dropTarget?.type === 'root'}
            members={members}
            onOpenDocument={onOpenDocument}
            onToggle={() => setCollapsedSections((current) => ({ ...current, mine: !current.mine }))}
            onToggleDoc={toggleDoc}
            selectedDocumentId={selectedDocumentId}
            title={t('workspace.library.mine')}
            tree={ownedTree}
            locale={locale}
          />
        </DndContext>
      )}

      <SidebarSectionList
        collapsed={collapsedSections.workspace}
        collapsedDocs={collapsedDocs}
        count={workspaceDocuments.length}
        docs={workspaceDocuments}
        emptyText={t('workspace.documents.emptyWorkspace')}
        icon={<Users size={16} />}
        members={members}
        onOpenDocument={onOpenDocument}
        onToggle={() => setCollapsedSections((current) => ({ ...current, workspace: !current.workspace }))}
        onToggleDoc={toggleDoc}
        selectedDocumentId={selectedDocumentId}
        title={t('workspace.library.workspace')}
        locale={locale}
      />

      <SidebarSectionList
        collapsed={collapsedSections.shared}
        collapsedDocs={collapsedDocs}
        count={sharedDocuments.length}
        docs={sharedDocuments}
        emptyText={t('workspace.documents.emptyShared')}
        icon={<Users size={16} />}
        members={members}
        onOpenDocument={onOpenDocument}
        onToggle={() => setCollapsedSections((current) => ({ ...current, shared: !current.shared }))}
        onToggleDoc={toggleDoc}
        selectedDocumentId={selectedDocumentId}
        title={t('workspace.library.shared')}
        locale={locale}
      />
    </aside>
  );
}

interface SidebarSectionListProps {
  canReparent?: boolean;
  collapsed: boolean;
  collapsedDocs: Set<string>;
  count: number;
  docs: CommunityDocumentSummary[];
  dropTarget?: DropTarget;
  emptyText: string;
  icon: React.ReactNode;
  isRootDropTarget?: boolean;
  locale: string;
  members: CommunityMember[] | undefined;
  onOpenDocument: (documentId: bigint) => void;
  onToggle: () => void;
  onToggleDoc: (documentId: bigint) => void;
  selectedDocumentId: bigint | null;
  title: string;
  tree?: DocNode[];
}

function SidebarSectionList({
  canReparent = false,
  collapsed,
  collapsedDocs,
  count,
  docs,
  dropTarget,
  emptyText,
  icon,
  isRootDropTarget,
  locale,
  members,
  onOpenDocument,
  onToggle,
  onToggleDoc,
  selectedDocumentId,
  title,
  tree,
}: SidebarSectionListProps) {
  const nodes = tree ?? docs.map((doc) => ({ ...doc, children: [] }));
  return (
    <section className="sidebar-section">
      <button type="button" className="sidebar-section-head" onClick={onToggle}>
        <span>
          {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          {title}
          <b>{count}</b>
        </span>
        {icon}
      </button>

      {!collapsed && canReparent && (
        <>
          <p className="sidebar-drag-hint">Drag pages onto each other to nest.</p>
          <RootDropTarget active={!!isRootDropTarget} />
        </>
      )}

      {!collapsed && nodes.length === 0 && <p className="sidebar-empty">{emptyText}</p>}

      {!collapsed && (
        <div className="sidebar-doc-list">
          {nodes.map((node) => (
            <SidebarDocNode
              key={node.id.toString()}
              canReparent={canReparent}
              collapsedDocs={collapsedDocs}
              depth={0}
              dropTarget={dropTarget}
              locale={locale}
              members={members}
              node={node}
              onOpenDocument={onOpenDocument}
              onToggleDoc={onToggleDoc}
              selectedDocumentId={selectedDocumentId}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RootDropTarget({ active }: { active: boolean }) {
  const { setNodeRef } = useDroppable({ id: ROOT_DROP_ID });
  return (
    <div ref={setNodeRef} className="sidebar-root-drop-zone" data-root-drop-target={active ? 'true' : undefined}>
      Top level
    </div>
  );
}

function SidebarDocNode({
  canReparent,
  collapsedDocs,
  depth,
  dropTarget,
  locale,
  members,
  node,
  onOpenDocument,
  onToggleDoc,
  selectedDocumentId,
}: {
  canReparent: boolean;
  collapsedDocs: Set<string>;
  depth: number;
  dropTarget?: DropTarget;
  locale: string;
  members: CommunityMember[] | undefined;
  node: DocNode;
  onOpenDocument: (documentId: bigint) => void;
  onToggleDoc: (documentId: bigint) => void;
  selectedDocumentId: bigint | null;
}) {
  const collapsed = collapsedDocs.has(node.id.toString());
  const hasChildren = node.children.length > 0;
  const activeDrop = dropTarget?.type === 'doc' && dropTarget.docId === node.id.toString();
  const { setNodeRef: setDropNodeRef } = useDroppable({ id: docDragId(node.id), disabled: !canReparent });
  const { attributes, listeners, setNodeRef: setDragNodeRef, transform, isDragging } = useDraggable({
    id: docDragId(node.id),
    disabled: !canReparent,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const author = members?.find((member) => member.principal.toText() === node.owner.toText())?.profile?.name ?? compactPrincipal(node.owner);

  return (
    <div className="sidebar-tree-item">
      <div
        className="sidebar-doc-row"
        data-drop-target={activeDrop ? 'true' : undefined}
        ref={setDropNodeRef}
        style={{ '--doc-depth': depth } as React.CSSProperties}
      >
        <button
          aria-label={hasChildren ? (collapsed ? 'Expand document' : 'Collapse document') : 'Document has no children'}
          className="sidebar-tree-toggle"
          disabled={!hasChildren}
          onClick={() => onToggleDoc(node.id)}
          type="button"
        >
          {hasChildren ? collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} /> : <span />}
        </button>
        <button
          className={selectedDocumentId === node.id ? 'sidebar-doc selected' : 'sidebar-doc'}
          data-dragging={isDragging ? 'true' : undefined}
          onClick={() => onOpenDocument(node.id)}
          ref={setDragNodeRef}
          style={style}
          title={canReparent ? 'Drag onto another page to nest' : undefined}
          type="button"
          {...attributes}
          {...listeners}
        >
          <FileText size={15} />
          <span>
            <strong>{node.title}</strong>
            <small>
              {node.communityShare ? 'workspace · ' : ''}
              {roleName(node.role)} · v{node.version.toString()} · {readableDate(node.updatedAt, locale)}
            </small>
            <small>{author}</small>
          </span>
        </button>
      </div>
      {!collapsed && hasChildren && (
        <div className="sidebar-tree-children">
          {node.children.map((child) => (
            <SidebarDocNode
              key={child.id.toString()}
              canReparent={canReparent}
              collapsedDocs={collapsedDocs}
              depth={depth + 1}
              dropTarget={dropTarget}
              locale={locale}
              members={members}
              node={child}
              onOpenDocument={onOpenDocument}
              onToggleDoc={onToggleDoc}
              selectedDocumentId={selectedDocumentId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DocumentEditorPanelProps {
  blocks: WorkspaceBlock[];
  canManageCommunityWorkspace: boolean;
  comments: WorkspaceComment[];
  communityName: string;
  focusRequest?: { id: string; nonce: number };
  isPinned: boolean;
  loading: boolean;
  locale: string;
  members: CommunityMember[] | undefined;
  message: string | null;
  onAddBlock: (afterIndex?: number, type?: WorkspaceBlockType, options?: { indent?: number; url?: string; caption?: string; text?: string }) => string | undefined;
  onArchive: () => Promise<void>;
  onBlockChecked: (blockId: string, checked: boolean) => void;
  onBlockCollapsed: (blockId: string, collapsed: boolean) => void;
  onBlockIndent: (blockId: string, delta: -1 | 1) => void;
  onBlockLinkToggle: (blockId: string, disabled: boolean) => void;
  onBlockMedia: (blockId: string, fields: { url?: string; caption?: string; text?: string }) => void;
  onBlockMove: (blockId: string, targetIndex: number) => void;
  onBlockNumbering: (blockId: string, mode?: WorkspaceNumberedListMode) => void;
  onBlockRemove: (blockId: string) => void;
  onBlockText: (blockId: string, text: string) => void;
  onBlockType: (blockId: string, type: WorkspaceBlockType) => void;
  onComment: (blockId: string, text: string, selection?: SelectionState) => void;
  onCompact: () => void;
  onDuplicateBlock: (blockId: string) => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onGrantAccess: (user: Principal, role: WorkspaceRole | null) => Promise<void>;
  onImportMarkdown: (file: File) => void;
  onInlineFormat: (blockId: string, type: Exclude<WorkspaceTextMarkType, 'comment'>, start: number, end: number, color?: WorkspaceHighlightColor) => void;
  onMergeBlock: (blockId: string) => string | undefined;
  onParentChange: (parentId: bigint | null) => void;
  onRedo: () => void;
  onRename: (title: string) => void;
  onResolveComment: (commentId: string, resolved: boolean) => void;
  onSetShare: (role: WorkspaceRole | null) => Promise<void>;
  onSync: () => void;
  onTogglePinned: () => void;
  onUndo: () => void;
  parentOptions: CommunityDocumentSummary[];
  selectedDocument: CommunityDocumentPayload | null | undefined;
  syncStatus: SyncStatus;
  undoState: { canUndo: boolean; canRedo: boolean };
}

function DocumentEditorPanel({
  blocks,
  canManageCommunityWorkspace,
  comments,
  communityName,
  focusRequest,
  isPinned,
  loading,
  locale,
  members,
  message,
  onAddBlock,
  onArchive,
  onBlockChecked,
  onBlockCollapsed,
  onBlockIndent,
  onBlockLinkToggle,
  onBlockMedia,
  onBlockMove,
  onBlockNumbering,
  onBlockRemove,
  onBlockText,
  onBlockType,
  onComment,
  onCompact,
  onDuplicateBlock,
  onExportJson,
  onExportMarkdown,
  onGrantAccess,
  onImportMarkdown,
  onInlineFormat,
  onMergeBlock,
  onParentChange,
  onRedo,
  onRename,
  onResolveComment,
  onSetShare,
  onSync,
  onTogglePinned,
  onUndo,
  parentOptions,
  selectedDocument,
  syncStatus,
  undoState,
}: DocumentEditorPanelProps) {
  const { t } = useTranslation();
  const [titleDraft, setTitleDraft] = useState(selectedDocument?.title ?? '');
  const [actionsOpen, setActionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [nestOpen, setNestOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareRole, setShareRole] = useState<WorkspaceRole | 'private'>(selectedDocument?.communityShare ?? 'private');
  const [grantPrincipal, setGrantPrincipal] = useState('');
  const [grantRole, setGrantRole] = useState<WorkspaceRole>(WorkspaceRole.viewer);
  const [commentBlockId, setCommentBlockId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSelection, setCommentSelection] = useState<SelectionState | undefined>();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(() => new Set());
  const [selection, setSelection] = useState<SelectionState | undefined>();
  const [slashBlockId, setSlashBlockId] = useState<string | undefined>();
  const markdownInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const canEdit = canEditWorkspaceRole(selectedDocument?.role);
  const canManage = canOwnWorkspaceRole(selectedDocument?.role) || canManageCommunityWorkspace;
  const openComments = comments.filter((comment) => !comment.resolved);
  const visibleBlockEntries = blocks
    .map((block, index) => ({ block, index, hidden: isBlockHiddenByCollapsedToggle(blocks, index) }))
    .filter((entry) => !entry.hidden);
  const numberedMarkers = computeNumberedListMarkers(visibleBlockEntries.map(({ block }) => block));
  const sortableBlockIds = visibleBlockEntries.map(({ block }) => block.id);
  const blockDragSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    setTitleDraft(selectedDocument?.title ?? '');
    setShareRole(selectedDocument?.communityShare ?? 'private');
    setSelectedBlockIds(new Set());
    setSelection(undefined);
    setSelectionMode(false);
    setCommentBlockId(null);
    setShareOpen(false);
    setNestOpen(false);
    setCommentsOpen(false);
  }, [selectedDocument?.id]);

  useEffect(() => {
    if (titleRef.current && document.activeElement !== titleRef.current && titleRef.current.innerText !== titleDraft) {
      titleRef.current.innerText = titleDraft;
    }
  }, [titleDraft]);

  useEffect(() => {
    if (selectedBlockIds.size === 0) return;
    const liveIds = new Set(blocks.map((block) => block.id));
    const next = new Set([...selectedBlockIds].filter((id) => liveIds.has(id)));
    if (next.size !== selectedBlockIds.size) {
      setSelectedBlockIds(next);
    }
  }, [blocks, selectedBlockIds]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!selectedDocument) {
    return (
      <main className="workspace-document-empty">
        <div className="locked-panel">
          <p className="amnesty-kicker">{t('workspace.documents.emptyTitle')}</p>
          <h3>{t('workspace.documents.emptyBodyTitle')}</h3>
          <p>{t('workspace.documents.emptyBody')}</p>
        </div>
      </main>
    );
  }

  const ownerLabel = members?.find((member) => member.principal.toText() === selectedDocument.owner.toText())?.profile?.name ?? compactPrincipal(selectedDocument.owner);
  const selectedBlocks = blocks.filter((block) => selectedBlockIds.has(block.id));
  const textBlockCommands = SLASH_COMMANDS.filter((command) => isTextEditableBlock(command.type));
  const selectedBlockType = selectedBlocks.length === 1 ? selectedBlocks[0].type : undefined;

  const applyInlineSelectionFormat = (type: Exclude<WorkspaceTextMarkType, 'comment'>, color?: WorkspaceHighlightColor) => {
    if (!selection) return;
    onInlineFormat(selection.blockId, type, selection.start, selection.end, color);
    setSelection(undefined);
  };

  const submitComment = () => {
    if (!commentBlockId || !commentDraft.trim()) return;
    onComment(commentBlockId, commentDraft.trim(), commentSelection);
    setCommentDraft('');
    setCommentBlockId(null);
    setCommentSelection(undefined);
  };

  const copySelectedMarkdown = async () => {
    const markdown = blocksToMarkdown(selectedBlocks);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      window.prompt(t('workspace.selection.copyFallback'), markdown);
    }
  };

  const submitGrant = async () => {
    if (!canManage || !grantPrincipal) return;
    await onGrantAccess(Principal.fromText(grantPrincipal), grantRole);
    setGrantPrincipal('');
    setShareOpen(false);
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : undefined;
    if (!overId || activeId === overId) return;
    const activeEntry = visibleBlockEntries.find(({ block }) => block.id === activeId);
    const overEntry = visibleBlockEntries.find(({ block }) => block.id === overId);
    if (!activeEntry || !overEntry) return;
    const targetIndex = activeEntry.index < overEntry.index ? overEntry.index + 1 : overEntry.index;
    onBlockMove(activeId, targetIndex);
  };

  const blockLabel = (blockId: string) => {
    const block = blocks.find((candidate) => candidate.id === blockId);
    if (!block) return 'Deleted block';
    return plainBlockText(block).trim().slice(0, 80) || `${block.type} block`;
  };

  return (
    <main className="document-stage" aria-label={t('workspace.documents.sidebarTitle')}>
      <div className="document-topbar">
        <div className="document-breadcrumb">
          <span>{t('app.nav.workspace')}</span>
          <b>/</b>
          <span>{communityName}</span>
          <b>|</b>
          <span>{selectedRoleLabel(selectedDocument.role, t)}</span>
        </div>
        <div className="document-toolbar">
          {blocks.length > 0 ? (
            <button className={selectionMode ? 'toolbar-button active' : 'toolbar-button'} onClick={() => setSelectionMode((current) => !current)} type="button">
              <Copy size={16} />
              {selectionMode ? t('workspace.selection.done') : t('workspace.selection.selectBlocks')}
            </button>
          ) : null}
          <button className="toolbar-button document-actions-button" onClick={() => setActionsOpen((current) => !current)} type="button">
            <MoreHorizontal size={16} />
            {t('workspace.actions.menu')}
          </button>
          {actionsOpen ? (
            <div className="document-action-menu">
              {canManage ? (
                <button onClick={() => { setShareOpen(true); setNestOpen(false); setActionsOpen(false); }} type="button">
                  <Share2 size={16} />
                  {t('workspace.share.title')}
                </button>
              ) : null}
              {canManage ? (
                <button onClick={() => { setNestOpen(true); setShareOpen(false); setActionsOpen(false); }} type="button">
                  <FolderTree size={16} />
                  {t('workspace.nesting.title')}
                </button>
              ) : null}
              <button onClick={() => { onTogglePinned(); setActionsOpen(false); }} type="button">
                <Pin size={16} />
                {isPinned ? t('workspace.actions.unpin') : t('workspace.actions.pin')}
              </button>
              <button disabled={!canEdit || !undoState.canUndo} onClick={() => { onUndo(); setActionsOpen(false); }} type="button">
                <Undo2 size={16} />
                {t('workspace.actions.undo')}
              </button>
              <button disabled={!canEdit || !undoState.canRedo} onClick={() => { onRedo(); setActionsOpen(false); }} type="button">
                <Redo2 size={16} />
                {t('workspace.actions.redo')}
              </button>
              <button disabled={!canEdit} onClick={() => { onSync(); setActionsOpen(false); }} type="button">
                <Save size={16} />
                {t('workspace.actions.sync')}
              </button>
              <button onClick={() => { onExportJson(); setActionsOpen(false); }} type="button">
                <Download size={16} />
                {t('workspace.actions.debugExport')}
              </button>
              <button onClick={() => { onExportMarkdown(); setActionsOpen(false); }} type="button">
                <Download size={16} />
                {t('workspace.actions.markdownExport')}
              </button>
              <button disabled={!canEdit} onClick={() => { markdownInputRef.current?.click(); setActionsOpen(false); }} type="button">
                <Upload size={16} />
                {t('workspace.actions.importMarkdown')}
              </button>
              <button disabled={!canEdit} onClick={() => { onCompact(); setActionsOpen(false); }} type="button">
                <MoreHorizontal size={16} />
                {t('workspace.actions.compact')}
              </button>
              <button disabled={!canManage} className="danger-button" onClick={() => { void onArchive(); setActionsOpen(false); }} type="button">
                <Trash2 size={16} />
                {t('workspace.actions.archive')}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {shareOpen ? (
        <div className="share-popover">
          <div>
            <strong>{t('workspace.share.title')}</strong>
            <p>{selectedShareLabel(selectedDocument.communityShare, t)}</p>
          </div>
          <select value={shareRole} disabled={!canManage} onChange={(event) => setShareRole(event.currentTarget.value as WorkspaceRole | 'private')}>
            <option value="private">{t('workspace.share.private')}</option>
            <option value={WorkspaceRole.viewer}>{t('workspace.share.communityViewer')}</option>
            <option value={WorkspaceRole.editor}>{t('workspace.share.communityEditor')}</option>
          </select>
          <button className="ghost-button" disabled={!canManage} onClick={() => void onSetShare(shareRole === 'private' ? null : shareRole)} type="button">
            {t('workspace.actions.updateShare')}
          </button>
          <div className="share-public">
            <strong>{t('workspace.grants.title')}</strong>
            <p>{t('workspace.grants.selectMember')}</p>
            <select value={grantPrincipal} disabled={!canManage} onChange={(event) => setGrantPrincipal(event.currentTarget.value)}>
              <option value="">{t('workspace.grants.selectMember')}</option>
              {sortMembers(members).map((member) => (
                <option key={member.principal.toText()} value={member.principal.toText()}>
                  {member.profile?.name ?? compactPrincipal(member.principal)}
                </option>
              ))}
            </select>
            <select value={grantRole} disabled={!canManage} onChange={(event) => setGrantRole(event.currentTarget.value as WorkspaceRole)}>
              <option value={WorkspaceRole.viewer}>{t('workspace.roles.viewer')}</option>
              <option value={WorkspaceRole.editor}>{t('workspace.roles.editor')}</option>
            </select>
            <button className="cta small" disabled={!canManage || !grantPrincipal} onClick={() => void submitGrant()} type="button">
              {t('workspace.actions.grant')}
            </button>
          </div>
        </div>
      ) : null}

      {nestOpen ? (
        <div className="share-popover nest-popover">
          <div>
            <strong>{t('workspace.nesting.title')}</strong>
            <p>{t('workspace.nesting.topLevel')}</p>
          </div>
          <select
            disabled={!canManage}
            value={selectedDocument.parentId?.toString() ?? ''}
            onChange={(event) => {
              onParentChange(event.currentTarget.value ? BigInt(event.currentTarget.value) : null);
              setNestOpen(false);
            }}
          >
            <option value="">{t('workspace.nesting.topLevel')}</option>
            {parentOptions.map((doc) => (
              <option key={doc.id.toString()} value={doc.id.toString()}>
                {doc.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <input
        ref={markdownInputRef}
        type="file"
        accept=".md,.markdown,text/markdown,text/plain"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onImportMarkdown(file);
          event.currentTarget.value = '';
        }}
      />

      <article className="document-page" onClick={(event) => {
        if (event.target === event.currentTarget && canEdit) onAddBlock(blocks.length - 1, 'paragraph');
      }}>
        <header className="document-title-area">
          <h1
            aria-label="Document title"
            contentEditable={canEdit}
            onBlur={(event) => {
              const nextTitle = event.currentTarget.innerText.replace(/\n/g, ' ').trim() || 'Untitled';
              setTitleDraft(nextTitle);
              void onRename(nextTitle);
            }}
            onInput={(event) => {
              setShareOpen(false);
              setSlashBlockId(undefined);
              setTitleDraft(event.currentTarget.innerText.replace(/\n/g, ' '));
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
              }
              if (event.key === 'Escape') {
                event.currentTarget.innerText = selectedDocument.title;
                setTitleDraft(selectedDocument.title);
                event.currentTarget.blur();
              }
            }}
            ref={titleRef}
            suppressContentEditableWarning
          />
          <p>
            <span className="avatar-dot">{ownerLabel.slice(0, 1).toUpperCase()}</span>
            <span className="status-dot" />
            <span>{ownerLabel}</span>
            <span>·</span>
            <span>{readableDate(selectedDocument.updatedAt, locale)}</span>
            <span>·</span>
            <span>{syncStatus}</span>
            <span>·</span>
            <span>{selectedShareLabel(selectedDocument.communityShare, t)}</span>
          </p>
        </header>

        {selectionMode ? (
          <div className="multi-block-toolbar" role="toolbar" aria-label="Selected block actions">
            <strong>{t('workspace.selection.selected', { count: selectedBlockIds.size })}</strong>
            <button disabled={selectedBlockIds.size === 0} onClick={() => void copySelectedMarkdown()} type="button">
              <Copy size={14} />
              {t('workspace.selection.copyMarkdown')}
            </button>
            <button disabled={!canEdit || selectedBlockIds.size === 0} onClick={() => selectedBlocks.forEach((block) => onBlockIndent(block.id, -1))} type="button">
              {t('workspace.selection.outdent')}
            </button>
            <button disabled={!canEdit || selectedBlockIds.size === 0} onClick={() => selectedBlocks.forEach((block) => onBlockIndent(block.id, 1))} type="button">
              {t('workspace.selection.indent')}
            </button>
            <span className="multi-block-divider" />
            <span className="multi-block-label">Turn into</span>
            <div className="multi-block-transform">
              {textBlockCommands.map((command) => (
                <button
                  className={selectedBlockType === command.type ? 'active' : undefined}
                  disabled={!canEdit || selectedBlockIds.size === 0}
                  key={command.type}
                  onClick={() => selectedBlocks.forEach((block) => onBlockType(block.id, command.type))}
                  type="button"
                >
                  {command.label}
                </button>
              ))}
            </div>
            <button disabled={selectedBlockIds.size === 0} onClick={() => setSelectedBlockIds(new Set())} type="button">
              {t('workspace.selection.clear')}
            </button>
            <button onClick={() => { setSelectionMode(false); setSelectedBlockIds(new Set()); }} type="button">
              {t('workspace.selection.done')}
            </button>
          </div>
        ) : null}

        <DndContext collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd} sensors={blockDragSensors}>
          <SortableContext items={sortableBlockIds} strategy={verticalListSortingStrategy}>
            <div className="document-blocks">
              {visibleBlockEntries.map(({ block, index }) => (
                <WorkspaceBlockRow
                  key={block.id}
                  block={block}
                  canEdit={canEdit}
                  commentsCount={comments.filter((comment) => !comment.resolved && comment.blockId === block.id).length}
                  focusRequest={focusRequest}
                  index={index}
                  isSlashOpen={slashBlockId === block.id}
                  numberedMarker={numberedMarkers[block.id]?.label}
                  onAddComment={(selectionState) => {
                    setCommentBlockId(block.id);
                    setCommentSelection(selectionState);
                    setCommentsOpen(true);
                  }}
                  onBlockChecked={onBlockChecked}
                  onBlockCollapsed={onBlockCollapsed}
                  onBlockIndent={onBlockIndent}
                  onBlockLinkToggle={onBlockLinkToggle}
                  onBlockMedia={onBlockMedia}
                  onBlockMove={onBlockMove}
                  onBlockNumbering={onBlockNumbering}
                  onBlockRemove={onBlockRemove}
                  onBlockText={onBlockText}
                  onBlockType={onBlockType}
                  onDuplicateBlock={onDuplicateBlock}
                  onFocusSelection={setSelection}
                  onInsertAfter={() => onAddBlock(index, nextBlockTypeAfterEnter(block.type), { indent: block.type === 'toggle' ? Math.min((block.indent ?? 0) + 1, 3) : block.indent })}
                  onInsertBefore={() => onAddBlock(Math.max(0, index - 1), 'paragraph', { indent: block.indent })}
                  onMergeBlock={onMergeBlock}
                  onOpenSlash={() => setSlashBlockId(block.id)}
                  onCloseSlash={() => setSlashBlockId(undefined)}
                  selected={selectedBlockIds.has(block.id)}
                  selectionMode={selectionMode}
                  setSelected={(selected) => {
                    setSelectedBlockIds((current) => {
                      const next = new Set(current);
                      if (selected) next.add(block.id);
                      else next.delete(block.id);
                      return next;
                    });
                  }}
                  totalBlocks={blocks.length}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {canEdit ? (
          <button className="document-tail" onClick={() => onAddBlock(blocks.length - 1, 'paragraph')} type="button">
            {t('workspace.editor.tailEditable')}
          </button>
        ) : (
          <p className="document-tail readonly">{t('workspace.editor.tailReadonly')}</p>
        )}
      </article>

      {selection && canEdit ? (
        <div
          className="selection-format-menu"
          style={{
            left: selection.menuPosition ? `${selection.menuPosition.left}px` : '50%',
            top: selection.menuPosition ? `${selection.menuPosition.top}px` : '140px',
          }}
        >
          <button type="button" onClick={() => applyInlineSelectionFormat('bold')}>Bold</button>
          <button type="button" onClick={() => applyInlineSelectionFormat('italic')}><Italic size={14} /> Italic</button>
          <span className="selection-menu-divider" />
          <span className="highlight-swatch-row">
            {(['yellow', 'green', 'blue', 'pink', 'purple'] as WorkspaceHighlightColor[]).map((color) => (
              <button
                aria-label={`Highlight ${color}`}
                className="highlight-swatch"
                data-highlight-color={color}
                key={color}
                onClick={() => applyInlineSelectionFormat('highlight', color)}
                type="button"
              />
            ))}
          </span>
          <span className="selection-menu-divider" />
          <button type="button" onClick={() => { setCommentBlockId(selection.blockId); setCommentSelection(selection); setCommentsOpen(true); }}>
            <MessageCircle size={14} />
            {t('workspace.comments.add')}
          </button>
        </div>
      ) : null}

      {(commentsOpen || commentBlockId) ? (
        <aside className="comment-panel" aria-label="Document comments">
          <div className="comment-panel-head">
            <div>
              <strong>{t('workspace.comments.openTitle')}</strong>
              <p>{openComments.length} open</p>
            </div>
            <button className="icon-button" onClick={() => { setCommentsOpen(false); setCommentBlockId(null); }} type="button">
              <X size={16} />
            </button>
          </div>
          {commentBlockId ? (
            <div className="comment-composer">
              <span className="comment-block-ref">{blockLabel(commentBlockId)}</span>
              {commentSelection?.text ? <blockquote className="comment-selection-preview">{commentSelection.text}</blockquote> : null}
              <textarea
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitComment();
                }}
                placeholder={t('workspace.comments.placeholder')}
              />
              <button className="ghost-button" disabled={!commentDraft.trim()} onClick={submitComment} type="button">
                <MessageCircle size={15} />
                {t('workspace.comments.submit')}
              </button>
            </div>
          ) : null}
          <div className="comment-list">
            {openComments.length === 0 ? <p className="sidebar-empty">{t('workspace.comments.empty')}</p> : null}
            {openComments.map((comment) => (
              <article className="comment-card" key={comment.id}>
                <button className="comment-card-ref" onClick={() => setCommentBlockId(comment.blockId)} type="button">
                  {blockLabel(comment.blockId)}
                </button>
                <p>{comment.text}</p>
                {comment.selectedText ? <blockquote>{comment.selectedText}</blockquote> : null}
                <small>{comment.author} · {new Date(comment.createdAt).toLocaleString(locale)}</small>
                <button className="comment-resolve" disabled={!canEdit} onClick={() => onResolveComment(comment.id, true)} type="button">
                  {t('workspace.comments.resolve')}
                </button>
              </article>
            ))}
          </div>
        </aside>
      ) : null}

      {message ? <p className="notice document-notice">{message}</p> : null}
    </main>
  );
}

interface WorkspaceBlockRowProps {
  block: WorkspaceBlock;
  canEdit: boolean;
  commentsCount: number;
  focusRequest?: { id: string; nonce: number };
  index: number;
  isSlashOpen: boolean;
  numberedMarker?: string;
  onAddComment: (selection?: SelectionState) => void;
  onBlockChecked: (blockId: string, checked: boolean) => void;
  onBlockCollapsed: (blockId: string, collapsed: boolean) => void;
  onBlockIndent: (blockId: string, delta: -1 | 1) => void;
  onBlockLinkToggle: (blockId: string, disabled: boolean) => void;
  onBlockMedia: (blockId: string, fields: { url?: string; caption?: string; text?: string }) => void;
  onBlockMove: (blockId: string, targetIndex: number) => void;
  onBlockNumbering: (blockId: string, mode?: WorkspaceNumberedListMode) => void;
  onBlockRemove: (blockId: string) => void;
  onBlockText: (blockId: string, text: string) => void;
  onBlockType: (blockId: string, type: WorkspaceBlockType) => void;
  onCloseSlash: () => void;
  onDuplicateBlock: (blockId: string) => void;
  onFocusSelection: (selection?: SelectionState) => void;
  onInsertAfter: () => void;
  onInsertBefore: () => void;
  onMergeBlock: (blockId: string) => string | undefined;
  onOpenSlash: () => void;
  selected: boolean;
  selectionMode: boolean;
  setSelected: (selected: boolean) => void;
  totalBlocks: number;
}

function WorkspaceBlockRow({
  block,
  canEdit,
  commentsCount,
  focusRequest,
  index,
  isSlashOpen,
  numberedMarker,
  onAddComment,
  onBlockChecked,
  onBlockCollapsed,
  onBlockIndent,
  onBlockLinkToggle,
  onBlockMedia,
  onBlockMove,
  onBlockNumbering,
  onBlockRemove,
  onBlockText,
  onBlockType,
  onCloseSlash,
  onDuplicateBlock,
  onFocusSelection,
  onInsertAfter,
  onInsertBefore,
  onMergeBlock,
  onOpenSlash,
  selected,
  selectionMode,
  setSelected,
  totalBlocks,
}: WorkspaceBlockRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [textFocused, setTextFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashQuery = slashQueryForText(block.text);
  const slashCommands = filterSlashCommands(slashQuery);
  const slashCommandGroups = commandGroups(slashCommands);
  const editable = canEdit && isTextEditableBlock(block.type);
  const detectedHref = firstValidHyperlink(block.text);
  const blockIndent = Math.max(0, Math.min(3, block.indent ?? 0));

  useEffect(() => {
    if (focusRequest?.id !== block.id) return;
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(textareaRef.current.value.length, textareaRef.current.value.length);
    });
  }, [block.id, focusRequest?.id, focusRequest?.nonce]);

  useEffect(() => {
    setSlashIndex(0);
  }, [slashQuery]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canEdit) return;
    if (isSlashOpen && slashCommands.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashIndex((current) => (current + 1) % slashCommands.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashIndex((current) => (current - 1 + slashCommands.length) % slashCommands.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        onBlockType(block.id, slashCommands[slashIndex].type);
        onBlockText(block.id, '');
        onCloseSlash();
        return;
      }
      if (event.key === 'Escape') {
        onCloseSlash();
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onInsertAfter();
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      onBlockIndent(block.id, event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === 'Backspace' && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0) {
      if (block.text.length === 0 && totalBlocks > 1) {
        event.preventDefault();
        onBlockRemove(block.id);
      } else if (block.text.length > 0) {
        event.preventDefault();
        onMergeBlock(block.id);
      }
    }
  };

  const blockTypeLabel = commandForBlockType(block.type).label;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled: !canEdit || selectionMode,
  });
  const style = {
    '--block-indent': `${blockIndent * 28}px`,
    opacity: isDragging ? 0.62 : undefined,
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div
      className={`notion-block block-${block.type}`}
      data-editable={canEdit ? 'true' : 'false'}
      data-selection-mode={selectionMode ? 'true' : undefined}
      ref={setNodeRef}
      style={style}
    >
      {selectionMode ? (
        <label className="block-select-control">
          <input type="checkbox" checked={selected} onChange={(event) => setSelected(event.currentTarget.checked)} />
        </label>
      ) : null}

      {!selectionMode && canEdit ? (
        <div className="block-hover-controls">
          <button className="icon-button subtle drag-handle" type="button" {...attributes} {...listeners}>
            <GripVertical size={16} />
          </button>
          <button className="icon-button subtle" onClick={() => setMenuOpen((current) => !current)} type="button">
            <MoreHorizontal size={15} />
          </button>
          {menuOpen ? (
            <div className="block-popover">
              <div className="block-popover-head">{blockTypeLabel}</div>
              <button type="button" onClick={onInsertBefore}>Insert above</button>
              <button type="button" onClick={onInsertAfter}>Insert below</button>
              <button disabled={index === 0} type="button" onClick={() => onBlockMove(block.id, index - 1)}>Move up</button>
              <button disabled={index >= totalBlocks - 1} type="button" onClick={() => onBlockMove(block.id, index + 1)}>Move down</button>
              <button type="button" onClick={() => onDuplicateBlock(block.id)}>Duplicate</button>
              <button type="button" onClick={() => onAddComment()}><MessageCircle size={14} /> Add comment</button>
              <button type="button" onClick={() => onBlockIndent(block.id, 1)}>Indent</button>
              <button type="button" onClick={() => onBlockIndent(block.id, -1)}>Outdent</button>
              {block.type === 'numbered' ? (
                <>
                  <div className="block-popover-divider" />
                  <button type="button" onClick={() => onBlockNumbering(block.id, undefined)}>Numbering: auto</button>
                  <button type="button" onClick={() => onBlockNumbering(block.id, 'continue')}>Continue previous list</button>
                  <button type="button" onClick={() => onBlockNumbering(block.id, 'restart')}>Restart at 1</button>
                </>
              ) : null}
              {detectedHref ? (
                <button type="button" onClick={() => onBlockLinkToggle(block.id, !block.linkDisabled)}>
                  {block.linkDisabled ? 'Enable detected hyperlink' : 'Disable detected hyperlink'}
                </button>
              ) : null}
              <div className="block-popover-divider" />
              <div className="block-type-groups" aria-label="Change block type">
                {commandGroups(SLASH_COMMANDS).map(({ group, commands }) => (
                  <div className="block-type-group" key={group}>
                    <span>{group}</span>
                    {commands.map((command) => (
                      <button
                        className={command.type === block.type ? 'selected' : undefined}
                        key={command.type}
                        onClick={() => {
                          onBlockType(block.id, command.type);
                          setMenuOpen(false);
                        }}
                        type="button"
                      >
                        <span>{command.label}</span>
                        <small>{command.markdown ?? command.hint}</small>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <button disabled={totalBlocks === 1} type="button" onClick={() => onBlockRemove(block.id)}>Delete</button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="block-content">
        <BlockContent
          block={block}
          blockTypeLabel={blockTypeLabel}
          canEdit={canEdit}
          editable={editable}
          numberedMarker={numberedMarker}
          onBlockChecked={onBlockChecked}
          onBlockCollapsed={onBlockCollapsed}
          onBlockMedia={onBlockMedia}
          onBlockText={onBlockText}
          onKeyDown={handleKeyDown}
          onOpenSlash={onOpenSlash}
          onTextBlur={() => setTextFocused(false)}
          onTextFocus={() => setTextFocused(true)}
          onSelection={onFocusSelection}
          ref={textareaRef}
          textFocused={textFocused}
        />

        {isSlashOpen && block.text.startsWith('/') ? (
          <div className="slash-menu">
            <div className="slash-menu-search">/{slashQuery || 'commands'}</div>
            {slashCommands.length === 0 ? <p className="slash-menu-empty">No matching commands</p> : null}
            {slashCommandGroups.map(({ group, commands }) => (
              <div className="slash-menu-group" key={group}>
                <span>{group}</span>
                {commands.map((command) => {
                  const commandIndex = slashCommands.findIndex((candidate) => candidate.type === command.type);
                  return (
                    <button
                      className={commandIndex === slashIndex ? 'selected' : undefined}
                      key={command.type}
                      onClick={() => {
                        onBlockType(block.id, command.type);
                        onBlockText(block.id, '');
                        onCloseSlash();
                      }}
                      onMouseEnter={() => setSlashIndex(commandIndex)}
                      type="button"
                    >
                      <span>{command.label}</span>
                      <small>{command.markdown ?? command.hint}</small>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}

        {detectedHref && !block.linkDisabled && (block.inlineMarks?.length ?? 0) === 0 && isTextEditableBlock(block.type) ? (
          <a className="linked-block-text" href={detectedHref} target="_blank" rel="noreferrer">
            {detectedHref}
          </a>
        ) : null}
      </div>

      {commentsCount > 0 ? (
        <button className="comment-pill block-comment-pill" onClick={() => onAddComment()} type="button">
          <MessageCircle size={13} />
          {commentsCount}
        </button>
      ) : null}
    </div>
  );
}

interface BlockContentProps {
  block: WorkspaceBlock;
  blockTypeLabel: string;
  canEdit: boolean;
  editable: boolean;
  numberedMarker?: string;
  onBlockChecked: (blockId: string, checked: boolean) => void;
  onBlockCollapsed: (blockId: string, collapsed: boolean) => void;
  onBlockMedia: (blockId: string, fields: { url?: string; caption?: string; text?: string }) => void;
  onBlockText: (blockId: string, text: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onOpenSlash: () => void;
  onTextBlur: () => void;
  onTextFocus: () => void;
  onSelection: (selection?: SelectionState) => void;
  textFocused: boolean;
}

const BlockContent = React.forwardRef<HTMLTextAreaElement, BlockContentProps>(function BlockContent({
  block,
  blockTypeLabel,
  canEdit,
  editable,
  numberedMarker,
  onBlockChecked,
  onBlockCollapsed,
  onBlockMedia,
  onBlockText,
  onKeyDown,
  onOpenSlash,
  onTextBlur,
  onTextFocus,
  onSelection,
  textFocused,
}, ref) {
  const textClass = 'editable-block-text workspace-textarea';
  const showInlinePreview = !textFocused && isTextEditableBlock(block.type) && (block.inlineMarks?.length ?? 0) > 0;
  const textShellClassName = showInlinePreview ? 'text-editor-shell has-inline-preview' : 'text-editor-shell';

  if (block.type === 'divider') {
    return <hr className="divider-block" />;
  }

  if (block.type === 'toggle') {
    return (
      <>
        <button type="button" disabled={!canEdit} onClick={() => onBlockCollapsed(block.id, !block.collapsed)} className="toggle-button">
          {block.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <span className={textShellClassName}>
          <textarea
            ref={ref}
            value={block.text}
            disabled={!editable}
            onBlur={onTextBlur}
            onChange={(event) => {
              onSelection(undefined);
              onBlockText(block.id, event.currentTarget.value);
            }}
            onKeyDown={onKeyDown}
            onSelect={(event) => onSelection(selectionFromTextarea(block.id, event.currentTarget))}
            onFocus={() => {
              onTextFocus();
              if (block.text === '/') onOpenSlash();
            }}
            rows={1}
            placeholder="Toggle heading"
            className={textClass}
          />
          {showInlinePreview ? <span className="marked-block-text" aria-hidden="true">{renderMarkedText(block.text, block.inlineMarks ?? [])}</span> : null}
        </span>
      </>
    );
  }

  if (block.type === 'image' || block.type === 'fileLink') {
    const href = block.url?.trim() || firstValidHyperlink(block.text) || '';
    return (
      <div className={block.type === 'image' ? 'media-block image-block' : 'media-block file-link-block'}>
        <div className="media-fields">
          <input
            value={block.url ?? ''}
            disabled={!canEdit}
            onChange={(event) => onBlockMedia(block.id, { url: event.currentTarget.value })}
            className="media-url-field"
            placeholder={block.type === 'image' ? 'Image URL' : 'File URL'}
          />
          <input
            value={block.caption ?? block.text}
            disabled={!canEdit}
            onChange={(event) => onBlockMedia(block.id, { caption: event.currentTarget.value, text: event.currentTarget.value })}
            className="media-caption-field"
            placeholder="Caption"
          />
        </div>
        {block.type === 'image' && href && (
          <img src={href} alt={block.caption || block.text || 'Workspace image'} />
        )}
        {block.type === 'fileLink' && href && (
          <a href={href} target="_blank" rel="noreferrer">
            <FileText size={16} />
            {block.caption || block.text || href}
          </a>
        )}
      </div>
    );
  }

  const prefix = block.type === 'bullet'
    ? '•'
    : block.type === 'numbered'
      ? numberedMarker ?? '1.'
      : block.type === 'checklist'
        ? ''
        : '';

  return (
    <>
      {block.type === 'checklist' && (
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onBlockChecked(block.id, !block.checked)}
          className={block.checked ? 'check-toggle checked' : 'check-toggle'}
        >
          {block.checked ? <Check size={13} /> : null}
        </button>
      )}
      {prefix && <span className="list-marker">{prefix}</span>}
      <span className={textShellClassName}>
        <textarea
          ref={ref}
          value={block.text}
          disabled={!editable}
          onBlur={onTextBlur}
          onChange={(event) => {
            onSelection(undefined);
            onBlockText(block.id, event.currentTarget.value);
            if (event.currentTarget.value === '/') onOpenSlash();
          }}
          onFocus={onTextFocus}
          onKeyDown={onKeyDown}
          onSelect={(event) => onSelection(selectionFromTextarea(block.id, event.currentTarget))}
          rows={Math.max(1, block.text.split('\n').length)}
          placeholder={`Type '/' for commands${blockTypeLabel ? ` · ${blockTypeLabel}` : ''}`}
          className={textClass}
        />
        {showInlinePreview ? <span className="marked-block-text" aria-hidden="true">{renderMarkedText(block.text, block.inlineMarks ?? [])}</span> : null}
      </span>
    </>
  );
});
