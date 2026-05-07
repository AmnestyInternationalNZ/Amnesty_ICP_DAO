import { ChevronDown, ChevronRight, FileText, FolderTree, Plus, Search, Users } from 'lucide-react';
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { CommunityDocumentSummary, CommunityMember } from '../../backend';
import { useLocalePreference } from '../../i18n/preferences';
import type { DocumentSearchResult } from '../../workspace/documentSearch';
import { compactPrincipal, readableDate, roleName } from '../../workspace/workspaceApi';
import LoadingSpinner from '../LoadingSpinner';

type SidebarSection = 'mine' | 'workspace' | 'shared';
type DocNode = CommunityDocumentSummary & { children: DocNode[] };
type DropTarget = { type: 'root' } | { type: 'doc'; docId: string };
const ROOT_DROP_ID = 'workspace-doc-root';

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

export function DocumentLibrarySidebar({
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
}: {
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
}) {
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
        <button className="cta workspace-create-button" disabled={!canCreateDocuments || newTitle.trim().length === 0} onClick={onCreateDocument} type="button">
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
          <div className="workspace-search-results" role="listbox" aria-label={t('workspace.search.placeholder')}>
            {searchLoading && <p className="sidebar-empty">{t('workspace.search.loading')}</p>}
            {!searchLoading && searchResults.length === 0 && <p className="sidebar-empty">{t('workspace.search.empty')}</p>}
            {!searchLoading &&
              searchResults.map((result) => (
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
            locale={locale}
            members={members}
            onOpenDocument={onOpenDocument}
            onToggle={() => setCollapsedSections((current) => ({ ...current, mine: !current.mine }))}
            onToggleDoc={toggleDoc}
            selectedDocumentId={selectedDocumentId}
            title={t('workspace.library.mine')}
            tree={ownedTree}
          />

          <SidebarSectionList
            collapsed={collapsedSections.workspace}
            collapsedDocs={collapsedDocs}
            count={workspaceDocuments.length}
            docs={workspaceDocuments}
            emptyText={t('workspace.documents.emptyWorkspace')}
            icon={<Users size={16} />}
            locale={locale}
            members={members}
            onOpenDocument={onOpenDocument}
            onToggle={() => setCollapsedSections((current) => ({ ...current, workspace: !current.workspace }))}
            onToggleDoc={toggleDoc}
            selectedDocumentId={selectedDocumentId}
            title={t('workspace.library.workspace')}
          />

          <SidebarSectionList
            collapsed={collapsedSections.shared}
            collapsedDocs={collapsedDocs}
            count={sharedDocuments.length}
            docs={sharedDocuments}
            emptyText={t('workspace.documents.emptyShared')}
            icon={<Users size={16} />}
            locale={locale}
            members={members}
            onOpenDocument={onOpenDocument}
            onToggle={() => setCollapsedSections((current) => ({ ...current, shared: !current.shared }))}
            onToggleDoc={toggleDoc}
            selectedDocumentId={selectedDocumentId}
            title={t('workspace.library.shared')}
          />
        </DndContext>
      )}
    </aside>
  );
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
}: {
  canReparent?: boolean;
  collapsed: boolean;
  collapsedDocs: Set<string>;
  count: number;
  docs: CommunityDocumentSummary[];
  dropTarget?: DropTarget;
  emptyText: string;
  icon: ReactNode;
  isRootDropTarget?: boolean;
  locale: string;
  members: CommunityMember[] | undefined;
  onOpenDocument: (documentId: bigint) => void;
  onToggle: () => void;
  onToggleDoc: (documentId: bigint) => void;
  selectedDocumentId: bigint | null;
  title: string;
  tree?: DocNode[];
}) {
  const { t } = useTranslation();
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
          <p className="sidebar-drag-hint">{t('workspace.nesting.dragHint')}</p>
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
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({ id: ROOT_DROP_ID });
  return (
    <div ref={setNodeRef} className="sidebar-root-drop-zone" data-root-drop-target={active ? 'true' : undefined}>
      {t('workspace.nesting.topLevel')}
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
        style={{ '--doc-depth': depth } as CSSProperties}
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
              {node.communityShare ? `workspace \u00b7 ` : ''}
              {roleName(node.role)} {'\u00b7'} v{node.version.toString()} {'\u00b7'} {readableDate(node.updatedAt, locale)}
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
