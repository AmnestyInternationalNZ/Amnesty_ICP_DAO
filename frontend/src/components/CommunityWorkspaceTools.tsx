import React, { useEffect, useMemo, useState } from 'react';
import { Principal } from '@dfinity/principal';
import * as Y from 'yjs';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  CommunityAccess,
  CommunityBoardPayload,
  CommunityDocumentPayload,
  CommunityEventInput,
  CommunityEventPayload,
  CommunityMember,
  CommunityRole,
  WorkspaceRole
} from '../backend';
import {
  useAddCommunityBoardCard,
  useAddCommunityBoardColumn,
  useAppendCommunityDocumentUpdate,
  useArchiveCommunityDocument,
  useCreateCommunityBoard,
  useCreateCommunityDocument,
  useCreateCommunityEvent,
  useGetCommunityBoard,
  useGetCommunityDocument,
  useListCommunityBoards,
  useListCommunityDocuments,
  useListCommunityEvents,
  useListCommunityMembers,
  useMoveCommunityBoardCard,
  useRenameCommunityDocument,
  useSaveCommunityDocumentSnapshot,
  useSetCommunityBoardShare,
  useSetCommunityDocumentGrant,
  useSetCommunityDocumentShare,
  useSetCommunityEventShare,
  useUpdateCommunityEvent
} from '../hooks/useQueries';
import { formatDateTime, formatNumber } from '../i18n/format';
import { useLocalePreference } from '../i18n/preferences';
import { applyPersistedState, encodeSnapshot, ensureInitialBlock, readBlocks, updateBlockText } from '../workspace/yjsBlocks';
import LoadingSpinner from './LoadingSpinner';

interface CommunityWorkspaceToolsProps {
  communityId: bigint;
  access: CommunityAccess;
}

const NANOS_PER_MILLI = BigInt(1_000_000);

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function nanosFromLocalInput(value: string): bigint {
  return BigInt(new Date(value).getTime()) * NANOS_PER_MILLI;
}

function localInputFromNanos(value: bigint): string {
  const date = new Date(Number(value / NANOS_PER_MILLI));
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function dateFromNanos(value: bigint): Date {
  return new Date(Number(value / NANOS_PER_MILLI));
}

function roleLabel(role: WorkspaceRole, t: TFunction): string {
  return t(`workspace.roles.${role}`);
}

function canEditWorkspaceRole(role?: WorkspaceRole | null): boolean {
  return role === WorkspaceRole.owner || role === WorkspaceRole.editor;
}

function canManageWorkspaceRole(role: WorkspaceRole | null | undefined, canManageCommunityWorkspace: boolean): boolean {
  return role === WorkspaceRole.owner || canManageCommunityWorkspace;
}

function documentToText(document: CommunityDocumentPayload | null): string {
  if (!document) return '';
  const yDoc = new Y.Doc();
  applyPersistedState(yDoc, document.snapshot ? [document.snapshot] : [], document.updates);
  ensureInitialBlock(yDoc);
  return readBlocks(yDoc).map((block) => block.text).join('\n');
}

function updateFromText(document: CommunityDocumentPayload | null, text: string): Uint8Array {
  const yDoc = new Y.Doc();
  if (document) {
    applyPersistedState(yDoc, document.snapshot ? [document.snapshot] : [], document.updates);
  }
  ensureInitialBlock(yDoc);
  const firstBlock = readBlocks(yDoc)[0];
  updateBlockText(yDoc, firstBlock.id, text);
  return encodeSnapshot(yDoc);
}

function memberOptions(members: CommunityMember[] | undefined): CommunityMember[] {
  return [...(members ?? [])].sort((a, b) => {
    const left = a.profile?.name ?? a.principal.toText();
    const right = b.profile?.name ?? b.principal.toText();
    return left.localeCompare(right);
  });
}

function ShareControls({
  currentShare,
  disabled,
  onShare
}: {
  currentShare: WorkspaceRole | null;
  disabled: boolean;
  onShare: (role: WorkspaceRole | null) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const [shareRole, setShareRole] = useState<WorkspaceRole | 'private'>(currentShare ?? 'private');

  useEffect(() => {
    setShareRole(currentShare ?? 'private');
  }, [currentShare]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={shareRole}
        disabled={disabled}
        onChange={(event) => setShareRole(event.currentTarget.value as WorkspaceRole | 'private')}
        className="border border-amnesty-line bg-white px-3 py-2 text-sm text-amnesty-ink"
      >
        <option value="private">{t('workspace.share.private')}</option>
        <option value={WorkspaceRole.viewer}>{t('workspace.share.communityViewer')}</option>
        <option value={WorkspaceRole.editor}>{t('workspace.share.communityEditor')}</option>
      </select>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onShare(shareRole === 'private' ? null : shareRole)}
        className="btn-secondary rounded-full px-4 py-2 text-sm"
      >
        {t('workspace.actions.updateShare')}
      </button>
    </div>
  );
}

export function DocumentsTool({ communityId, canManageCommunityWorkspace }: { communityId: bigint; canManageCommunityWorkspace: boolean }) {
  const { t } = useTranslation();
  const { data: documents, isLoading } = useListCommunityDocuments(communityId);
  const { data: members } = useListCommunityMembers(communityId);
  const createDocument = useCreateCommunityDocument();
  const renameDocument = useRenameCommunityDocument();
  const appendUpdate = useAppendCommunityDocumentUpdate();
  const saveSnapshot = useSaveCommunityDocumentSnapshot();
  const setShare = useSetCommunityDocumentShare();
  const setGrant = useSetCommunityDocumentGrant();
  const archiveDocument = useArchiveCommunityDocument();
  const [selectedDocumentId, setSelectedDocumentId] = useState<bigint | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [grantPrincipal, setGrantPrincipal] = useState('');
  const [grantRole, setGrantRole] = useState<WorkspaceRole>(WorkspaceRole.viewer);
  const { data: selectedDocument, isLoading: selectedLoading } = useGetCommunityDocument(communityId, selectedDocumentId);

  useEffect(() => {
    if (!selectedDocumentId && documents && documents.length > 0) {
      setSelectedDocumentId(documents[0].id);
    }
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    setTitleDraft(selectedDocument?.title ?? '');
    setBodyDraft(documentToText(selectedDocument ?? null));
  }, [selectedDocument?.id, selectedDocument?.version]);

  async function create() {
    const title = newTitle.trim();
    if (!title) return;
    const id = await createDocument.mutateAsync({ communityId, title });
    setNewTitle('');
    setSelectedDocumentId(id);
  }

  async function save() {
    if (!selectedDocument) return;
    if (titleDraft.trim() && titleDraft.trim() !== selectedDocument.title) {
      await renameDocument.mutateAsync({ communityId, documentId: selectedDocument.id, title: titleDraft.trim() });
    }
    await appendUpdate.mutateAsync({
      communityId,
      documentId: selectedDocument.id,
      update: updateFromText(selectedDocument, bodyDraft)
    });
  }

  async function compact() {
    if (!selectedDocument) return;
    await saveSnapshot.mutateAsync({
      communityId,
      documentId: selectedDocument.id,
      snapshot: updateFromText(selectedDocument, bodyDraft),
      compactThroughVersion: selectedDocument.version
    });
  }

  async function grant() {
    if (!selectedDocument || !grantPrincipal.trim()) return;
    await setGrant.mutateAsync({
      communityId,
      documentId: selectedDocument.id,
      user: Principal.fromText(grantPrincipal.trim()),
      role: grantRole
    });
    setGrantPrincipal('');
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.34fr_0.66fr]">
      <aside className="border border-amnesty-line bg-[#f4f7f8] p-5">
        <p className="amnesty-kicker text-amnesty-blue mb-3">{t('workspace.documents.sidebarTitle')}</p>
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.currentTarget.value)}
            placeholder={t('workspace.documents.newPlaceholder')}
            className="min-w-0 flex-1 border border-amnesty-line px-3 py-2"
          />
          <button type="button" onClick={create} disabled={createDocument.isPending} className="btn-primary rounded-full px-4 py-2 text-sm">
            {t('common.actions.create')}
          </button>
        </div>

        <div className="mt-5 space-y-2">
          {isLoading ? (
            <LoadingSpinner />
          ) : documents && documents.length > 0 ? (
            documents.map((document) => (
              <button
                key={document.id.toString()}
                type="button"
                onClick={() => setSelectedDocumentId(document.id)}
                className={`w-full border px-4 py-3 text-left ${selectedDocumentId === document.id ? 'border-amnesty-ink bg-white' : 'border-amnesty-line bg-white/70'}`}
              >
                <span className="block text-lg amnesty-heading">{document.title}</span>
                <span className="mt-1 block text-xs text-[#5c727d]">
                  {roleLabel(document.role, t)}
                  {document.communityShare ? ` - ${roleLabel(document.communityShare, t)}` : ''}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-[#5c727d]">{t('workspace.documents.empty')}</p>
          )}
        </div>
      </aside>

      <section className="border border-amnesty-line bg-white p-5">
        {selectedLoading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : selectedDocument ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <input
                value={titleDraft}
                disabled={!canEditWorkspaceRole(selectedDocument.role)}
                onChange={(event) => setTitleDraft(event.currentTarget.value)}
                className="min-w-0 flex-1 border-b-4 border-amnesty-yellow bg-transparent py-2 text-4xl text-amnesty-ink amnesty-heading focus:outline-none"
              />
              <span className="w-fit bg-amnesty-yellow px-3 py-2 text-sm amnesty-heading">
                {roleLabel(selectedDocument.role, t)}
              </span>
            </div>

            <textarea
              value={bodyDraft}
              disabled={!canEditWorkspaceRole(selectedDocument.role)}
              onChange={(event) => setBodyDraft(event.currentTarget.value)}
              className="min-h-[22rem] w-full border border-amnesty-line bg-[#fffef2] p-4 text-lg leading-8 text-amnesty-ink"
              placeholder={t('workspace.documents.bodyPlaceholder')}
            />

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={save} disabled={!canEditWorkspaceRole(selectedDocument.role) || appendUpdate.isPending} className="btn-primary rounded-full">
                {t('common.actions.save')}
              </button>
              <button type="button" onClick={compact} disabled={!canEditWorkspaceRole(selectedDocument.role)} className="btn-secondary rounded-full">
                {t('workspace.actions.compact')}
              </button>
              <button type="button" onClick={() => archiveDocument.mutate({ communityId, documentId: selectedDocument.id })} disabled={!canManageWorkspaceRole(selectedDocument.role, canManageCommunityWorkspace)} className="btn-secondary rounded-full">
                {t('workspace.actions.archive')}
              </button>
            </div>

            {canManageWorkspaceRole(selectedDocument.role, canManageCommunityWorkspace) && (
              <div className="grid gap-4 border border-amnesty-line bg-[#f4f7f8] p-4 lg:grid-cols-2">
                <div>
                  <p className="amnesty-kicker text-amnesty-green mb-3">{t('workspace.share.title')}</p>
                  <ShareControls
                    currentShare={selectedDocument.communityShare}
                    disabled={setShare.isPending}
                    onShare={(role) => setShare.mutateAsync({ communityId, documentId: selectedDocument.id, role })}
                  />
                </div>
                <div>
                  <p className="amnesty-kicker text-amnesty-pink mb-3">{t('workspace.grants.title')}</p>
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={grantPrincipal}
                      onChange={(event) => setGrantPrincipal(event.currentTarget.value)}
                      className="min-w-[14rem] flex-1 border border-amnesty-line bg-white px-3 py-2"
                    >
                      <option value="">{t('workspace.grants.selectMember')}</option>
                      {memberOptions(members).map((member) => (
                        <option key={member.principal.toText()} value={member.principal.toText()}>
                          {member.profile?.name ?? member.principal.toText()}
                        </option>
                      ))}
                    </select>
                    <select value={grantRole} onChange={(event) => setGrantRole(event.currentTarget.value as WorkspaceRole)} className="border border-amnesty-line bg-white px-3 py-2">
                      <option value={WorkspaceRole.viewer}>{t('workspace.roles.viewer')}</option>
                      <option value={WorkspaceRole.editor}>{t('workspace.roles.editor')}</option>
                    </select>
                    <button type="button" onClick={grant} disabled={setGrant.isPending} className="btn-secondary rounded-full px-4 py-2">
                      {t('workspace.actions.grant')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-16 text-center">
            <h3 className="text-4xl text-amnesty-ink amnesty-heading">{t('workspace.documents.emptyTitle')}</h3>
            <p className="mt-4 text-lg text-[#38505d]">{t('workspace.documents.emptyBody')}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function BoardsTool({
  communityId,
  canManageCommunityWorkspace,
  initialBoardId,
  onOpenBoardRoute,
}: {
  communityId: bigint;
  canManageCommunityWorkspace: boolean;
  initialBoardId?: bigint;
  onOpenBoardRoute?: (boardId: bigint) => void;
}) {
  const { t } = useTranslation();
  const { data: boards, isLoading } = useListCommunityBoards(communityId);
  const createBoard = useCreateCommunityBoard();
  const addColumn = useAddCommunityBoardColumn();
  const addCard = useAddCommunityBoardCard();
  const moveCardMutation = useMoveCommunityBoardCard();
  const setShare = useSetCommunityBoardShare();
  const [selectedBoardId, setSelectedBoardId] = useState<bigint | null>(initialBoardId ?? null);
  const [newTitle, setNewTitle] = useState('');
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const { data: selectedBoard, isLoading: selectedBoardLoading } = useGetCommunityBoard(communityId, selectedBoardId);

  useEffect(() => {
    setSelectedBoardId(initialBoardId ?? null);
  }, [initialBoardId]);

  useEffect(() => {
    if (selectedBoardId === null && boards && boards.length > 0) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoardId]);

  function openBoard(boardId: bigint) {
    setSelectedBoardId(boardId);
    onOpenBoardRoute?.(boardId);
  }

  async function create() {
    const title = newTitle.trim();
    if (!title) return;
    const id = await createBoard.mutateAsync({ communityId, title });
    setNewTitle('');
    openBoard(id);
  }

  async function createColumn() {
    if (!selectedBoard || !newColumnTitle.trim()) return;
    await addColumn.mutateAsync({ communityId, boardId: selectedBoard.id, title: newColumnTitle.trim() });
    setNewColumnTitle('');
  }

  async function createCard(columnId: bigint) {
    if (!selectedBoard || !newCardTitle.trim()) return;
    await addCard.mutateAsync({
      communityId,
      boardId: selectedBoard.id,
      columnId,
      input: { title: newCardTitle.trim() }
    });
    setNewCardTitle('');
  }

  async function moveCard(board: CommunityBoardPayload, cardId: bigint, currentColumnId: bigint, direction: -1 | 1) {
    const currentIndex = board.columns.findIndex((column) => column.id === currentColumnId);
    const target = board.columns[currentIndex + direction];
    if (!target) return;
    await moveCardMutation.mutateAsync({
      communityId,
      boardId: board.id,
      cardId,
      toColumnId: target.id,
      toIndex: BigInt(target.cardIds.length)
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row">
        <input value={newTitle} onChange={(event) => setNewTitle(event.currentTarget.value)} placeholder={t('boards.newPlaceholder')} className="flex-1 border border-amnesty-line px-4 py-3" />
        <button type="button" onClick={create} className="btn-primary rounded-full">{t('boards.actions.createBoard')}</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.28fr_0.72fr]">
        <aside className="space-y-2">
          {isLoading ? <LoadingSpinner /> : boards && boards.length > 0 ? boards.map((board) => (
            <button key={board.id.toString()} type="button" onClick={() => openBoard(board.id)} className={`w-full border px-4 py-3 text-left ${selectedBoardId === board.id ? 'border-amnesty-ink bg-white' : 'border-amnesty-line bg-[#f4f7f8]'}`}>
              <span className="block text-lg amnesty-heading">{board.title}</span>
              <span className="text-xs text-[#5c727d]">{formatNumber(board.cardCount)} {t('boards.labels.cards')}</span>
            </button>
          )) : <p className="text-sm text-[#5c727d]">{t('boards.empty')}</p>}
        </aside>

        {selectedBoard ? (
          <section className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-4xl text-amnesty-ink amnesty-heading">{selectedBoard.title}</h3>
                <p className="mt-2 text-sm text-[#5c727d]">{roleLabel(selectedBoard.role, t)}</p>
              </div>
              <ShareControls
                currentShare={selectedBoard.communityShare}
                disabled={!canManageWorkspaceRole(selectedBoard.role, canManageCommunityWorkspace) || setShare.isPending}
                onShare={(role) => setShare.mutateAsync({ communityId, boardId: selectedBoard.id, role })}
              />
            </div>

            {canEditWorkspaceRole(selectedBoard.role) && (
              <div className="flex flex-col gap-3 md:flex-row">
                <input value={newColumnTitle} onChange={(event) => setNewColumnTitle(event.currentTarget.value)} placeholder={t('boards.newColumnPlaceholder')} className="flex-1 border border-amnesty-line px-4 py-3" />
                <button type="button" onClick={createColumn} className="btn-secondary rounded-full">{t('boards.actions.addColumn')}</button>
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-3">
              {selectedBoard.columns.map((column) => (
                <div key={column.id.toString()} className="min-h-[18rem] border border-amnesty-line bg-[#f4f7f8] p-4">
                  <h4 className="text-2xl text-amnesty-ink amnesty-heading">{column.title}</h4>
                  <div className="mt-4 space-y-3">
                    {column.cardIds.map((cardId) => {
                      const card = selectedBoard.cards.find((candidate) => candidate.id === cardId);
                      if (!card) return null;
                      return (
                        <article key={card.id.toString()} className="border border-amnesty-line bg-white p-4">
                          <h5 className="text-xl amnesty-heading">{card.title}</h5>
                          {card.description && <p className="mt-2 text-sm leading-6 text-[#38505d]">{card.description}</p>}
                          {canEditWorkspaceRole(selectedBoard.role) && (
                            <div className="mt-3 flex gap-2">
                              <button type="button" onClick={() => moveCard(selectedBoard, card.id, column.id, -1)} className="text-xs amnesty-heading">{t('boards.actions.moveLeft')}</button>
                              <button type="button" onClick={() => moveCard(selectedBoard, card.id, column.id, 1)} className="text-xs amnesty-heading">{t('boards.actions.moveRight')}</button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                    {canEditWorkspaceRole(selectedBoard.role) && (
                      <div className="border border-dashed border-amnesty-line bg-white/70 p-3">
                        <input value={newCardTitle} onChange={(event) => setNewCardTitle(event.currentTarget.value)} placeholder={t('boards.newCardPlaceholder')} className="w-full border border-amnesty-line px-3 py-2" />
                        <button type="button" onClick={() => createCard(column.id)} className="btn-secondary mt-3 rounded-full px-4 py-2 text-sm">{t('boards.actions.addCard')}</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : selectedBoardId !== null && !selectedBoardLoading ? (
          <section className="border border-amnesty-line bg-white p-8 text-center">
            <p className="amnesty-kicker text-amnesty-pink mb-3">{t('app.nav.boards')}</p>
            <h3 className="text-4xl amnesty-heading">Board unavailable</h3>
            <p className="mt-4 text-[#38505d]">
              This board may be private, archived, deleted, or shared with a different community.
            </p>
          </section>
        ) : (
          <section className="border border-amnesty-line bg-white p-8 text-center">
            <h3 className="text-4xl amnesty-heading">{t('boards.emptyTitle')}</h3>
            <p className="mt-4 text-[#38505d]">{t('boards.emptyBody')}</p>
          </section>
        )}
      </div>
    </div>
  );
}

export function CalendarTool({ communityId, canManageCommunityWorkspace }: { communityId: bigint; canManageCommunityWorkspace: boolean }) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const { data: events } = useListCommunityEvents(communityId);
  const createEvent = useCreateCommunityEvent();
  const updateEvent = useUpdateCommunityEvent();
  const setShare = useSetCommunityEventShare();
  const defaultStart = useMemo(() => {
    const date = new Date();
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);
    return date;
  }, []);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    start: localInputFromNanos(BigInt(defaultStart.getTime()) * NANOS_PER_MILLI),
    end: localInputFromNanos(BigInt(defaultStart.getTime() + 60 * 60 * 1000) * NANOS_PER_MILLI),
    allDay: false
  });
  const [editingEvent, setEditingEvent] = useState<CommunityEventPayload | null>(null);

  function inputFromForm(): CommunityEventInput {
    return {
      title: form.title.trim(),
      description: optionalText(form.description),
      location: optionalText(form.location),
      startUtc: nanosFromLocalInput(form.start),
      endUtc: nanosFromLocalInput(form.end),
      allDay: form.allDay
    };
  }

  async function save() {
    const input = inputFromForm();
    if (!input.title) return;
    if (editingEvent) {
      await updateEvent.mutateAsync({ communityId, eventId: editingEvent.id, input });
      setEditingEvent(null);
    } else {
      await createEvent.mutateAsync({ communityId, input });
    }
    setForm((current) => ({ ...current, title: '', description: '', location: '' }));
  }

  function edit(event: CommunityEventPayload) {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      start: localInputFromNanos(event.startUtc),
      end: localInputFromNanos(event.endUtc),
      allDay: event.allDay
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.36fr_0.64fr]">
      <section className="border border-amnesty-line bg-[#f4f7f8] p-5">
        <p className="amnesty-kicker text-amnesty-orange mb-3">{editingEvent ? t('calendar.editTitle') : t('calendar.createTitle')}</p>
        <div className="space-y-3">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.currentTarget.value })} placeholder={t('calendar.fields.title')} className="w-full border border-amnesty-line px-4 py-3" />
          <input value={form.location} onChange={(event) => setForm({ ...form, location: event.currentTarget.value })} placeholder={t('calendar.fields.location')} className="w-full border border-amnesty-line px-4 py-3" />
          <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.currentTarget.value })} placeholder={t('calendar.fields.description')} className="min-h-[7rem] w-full border border-amnesty-line px-4 py-3" />
          <input type="datetime-local" value={form.start} onChange={(event) => setForm({ ...form, start: event.currentTarget.value })} className="w-full border border-amnesty-line px-4 py-3" />
          <input type="datetime-local" value={form.end} onChange={(event) => setForm({ ...form, end: event.currentTarget.value })} className="w-full border border-amnesty-line px-4 py-3" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.allDay} onChange={(event) => setForm({ ...form, allDay: event.currentTarget.checked })} />
            {t('calendar.fields.allDay')}
          </label>
          <button type="button" onClick={save} className="btn-primary w-full rounded-full">
            {editingEvent ? t('calendar.actions.update') : t('calendar.actions.create')}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        {events && events.length > 0 ? (
          [...events].sort((a, b) => Number(a.startUtc - b.startUtc)).map((event) => (
            <article key={event.id.toString()} className="border border-amnesty-line bg-white p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="amnesty-kicker text-amnesty-blue mb-2">{formatDateTime(dateFromNanos(event.startUtc), locale)}</p>
                  <h3 className="text-3xl text-amnesty-ink amnesty-heading">{event.title}</h3>
                  {event.location && <p className="mt-2 text-sm text-[#38505d]">{event.location}</p>}
                  {event.description && <p className="mt-3 text-base leading-7 text-[#38505d]">{event.description}</p>}
                </div>
                <div className="flex flex-col gap-3">
                  <span className="bg-amnesty-yellow px-3 py-2 text-sm amnesty-heading">{roleLabel(event.role, t)}</span>
                  {canEditWorkspaceRole(event.role) && <button type="button" onClick={() => edit(event)} className="btn-secondary rounded-full px-4 py-2 text-sm">{t('common.actions.save')}</button>}
                </div>
              </div>
              {canManageWorkspaceRole(event.role, canManageCommunityWorkspace) && (
                <div className="mt-4 border-t border-amnesty-line pt-4">
                  <ShareControls
                    currentShare={event.communityShare}
                    disabled={setShare.isPending}
                    onShare={(role) => setShare.mutateAsync({ communityId, eventId: event.id, role })}
                  />
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="border border-amnesty-line bg-white p-8 text-center">
            <h3 className="text-4xl amnesty-heading">{t('calendar.emptyTitle')}</h3>
            <p className="mt-4 text-[#38505d]">{t('calendar.emptyBody')}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function CommunityWorkspaceTools({ communityId, access }: CommunityWorkspaceToolsProps) {
  const { t } = useTranslation();
  const [activeTool, setActiveTool] = useState<'documents' | 'boards' | 'calendar'>('documents');
  const canUseWorkspace = access.isPlatformAdmin || access.communityRole !== null;
  const canManageCommunityWorkspace = access.isPlatformAdmin || access.communityRole === CommunityRole.communityAdmin;

  if (!canUseWorkspace) {
    return (
      <section className="amnesty-panel bg-white p-8 md:p-10">
        <p className="amnesty-kicker text-amnesty-blue mb-4">{t('workspace.kicker')}</p>
        <h2 className="text-5xl text-amnesty-ink amnesty-heading">{t('workspace.viewerLockedTitle')}</h2>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">{t('workspace.viewerLockedBody')}</p>
      </section>
    );
  }

  return (
    <section className="amnesty-panel bg-white p-8 md:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="amnesty-kicker text-amnesty-blue mb-4">{t('workspace.kicker')}</p>
          <h2 className="text-5xl text-amnesty-ink amnesty-heading">{t('workspace.title')}</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-[#38505d]">{t('workspace.body')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(['documents', 'boards', 'calendar'] as const).map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => setActiveTool(tool)}
              className={`rounded-full px-5 py-3 text-sm amnesty-heading ${
                activeTool === tool ? 'bg-amnesty-yellow text-amnesty-ink' : 'border border-amnesty-line bg-white text-amnesty-ink'
              }`}
            >
              {t(`workspace.tabs.${tool}`)}
            </button>
          ))}
        </div>
      </div>

      {activeTool === 'documents' && <DocumentsTool communityId={communityId} canManageCommunityWorkspace={canManageCommunityWorkspace} />}
      {activeTool === 'boards' && <BoardsTool communityId={communityId} canManageCommunityWorkspace={canManageCommunityWorkspace} />}
      {activeTool === 'calendar' && <CalendarTool communityId={communityId} canManageCommunityWorkspace={canManageCommunityWorkspace} />}
    </section>
  );
}
