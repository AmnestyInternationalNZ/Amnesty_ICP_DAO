import React, { useEffect, useMemo, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Code2, FileText, GripVertical, Maximize2, Save, Trash2, X } from 'lucide-react';
import type { Principal } from '@dfinity/principal';
import type { CommunityDocumentSummary, CommunityEventPayload, CommunityMember, KanbanCard as KanbanCardType, KanbanCardInput } from '../../backend';
import { routePaths } from '../../routing/appRoutes';
import { compactPrincipal, readableDate } from '../../workspace/workspaceApi';
import CardMarkdown from './cardMarkdown';

const NANOS_PER_MILLI = BigInt(1_000_000);

export type KanbanCardUpdateFields = {
  title: string;
  description: string | null;
  assignedTo: Principal[];
  docId: bigint | null;
  eventId: bigint | null;
  dueDateUtc: bigint | null;
};

export function cardKey(cardId: bigint): string {
  return `card:${cardId.toString()}`;
}

export function parseCardKey(value: string): bigint | undefined {
  if (!value.startsWith('card:')) return undefined;
  const id = value.slice('card:'.length);
  if (!/^\d+$/.test(id)) return undefined;
  return BigInt(id);
}

function dateInputFromUtc(value: bigint | null): string {
  if (value === null) return '';
  return new Date(Number(value / NANOS_PER_MILLI)).toISOString().slice(0, 10);
}

function dueDateFromInput(value: string): bigint | null {
  if (!value) return null;
  return BigInt(new Date(`${value}T00:00:00.000Z`).getTime()) * NANOS_PER_MILLI;
}

function dueDateLabel(value: bigint | null): string {
  if (value === null) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(Number(value / NANOS_PER_MILLI)));
}

function utcTodayStartNs(): bigint {
  const now = new Date();
  return BigInt(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())) * NANOS_PER_MILLI;
}

function principalLabel(members: CommunityMember[], principal: Principal): string {
  return members.find((member) => member.principal.toText() === principal.toText())?.profile?.name ?? compactPrincipal(principal);
}

function samePrincipalList(left: Principal[], right: Principal[]): boolean {
  if (left.length !== right.length) return false;
  const rightText = new Set(right.map((item) => item.toText()));
  return left.every((item) => rightText.has(item.toText()));
}

function selectValues(options: HTMLOptionsCollection): string[] {
  return Array.from(options).filter((option) => option.selected).map((option) => option.value);
}

export default function KanbanCard({
  canEdit,
  card,
  communityId,
  documents,
  events,
  memberOptions,
  onDelete,
  onUpdate,
}: {
  canEdit: boolean;
  card: KanbanCardType;
  communityId: bigint;
  documents: CommunityDocumentSummary[];
  events: CommunityEventPayload[];
  memberOptions: CommunityMember[];
  onDelete: (cardId: bigint) => void;
  onUpdate: (cardId: bigint, fields: KanbanCardUpdateFields) => Promise<boolean | void> | boolean | void;
}) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: cardKey(card.id),
    data: { kind: 'card', cardId: card.id },
    disabled: !canEdit,
  });
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? '');
  const [assignedTo, setAssignedTo] = useState<string[]>(card.assignedTo.map((principal) => principal.toText()));
  const [docId, setDocId] = useState(card.docId?.toString() ?? '');
  const [eventId, setEventId] = useState(card.eventId?.toString() ?? '');
  const [dueDate, setDueDate] = useState(dateInputFromUtc(card.dueDateUtc));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMode, setDetailsMode] = useState<'preview' | 'edit'>('preview');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description ?? '');
    setAssignedTo(card.assignedTo.map((principal) => principal.toText()));
    setDocId(card.docId?.toString() ?? '');
    setEventId(card.eventId?.toString() ?? '');
    setDueDate(dateInputFromUtc(card.dueDateUtc));
  }, [card.id, card.title, card.description, card.assignedTo, card.docId, card.eventId, card.dueDateUtc]);

  const overdue = useMemo(() => Boolean(card.dueDateUtc !== null && card.dueDateUtc < utcTodayStartNs()), [card.dueDateUtc]);
  const documentLink = documents.find((document) => document.id === card.docId);
  const eventLink = events.find((event) => event.id === card.eventId);

  const nextFields = (): KanbanCardUpdateFields => ({
    title: title.trim() || card.title,
    description: description.trim() ? description : null,
    assignedTo: assignedTo.map((value) => memberOptions.find((member) => member.principal.toText() === value)?.principal).filter((principal): principal is Principal => Boolean(principal)),
    docId: docId ? BigInt(docId) : null,
    eventId: eventId ? BigInt(eventId) : null,
    dueDateUtc: dueDateFromInput(dueDate),
  });

  async function commitTitle() {
    if (!canEdit) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === card.title) {
      setTitle(card.title);
      return;
    }
    await onUpdate(card.id, { ...nextFields(), title: trimmed });
  }

  async function saveDetails() {
    if (!canEdit) return;
    setIsSaving(true);
    setSaveError('');
    try {
      const saved = await onUpdate(card.id, nextFields());
      if (saved !== false) {
        setDetailsOpen(false);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSaving(false);
    }
  }

  function openDetails() {
    setDetailsMode(canEdit && !(card.description ?? '').trim() ? 'edit' : 'preview');
    setDetailsOpen(true);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article className={[isDragging ? 'kanban-card dragging' : 'kanban-card', overdue ? 'overdue' : ''].filter(Boolean).join(' ')} ref={setNodeRef} style={style}>
      <div className="kanban-card-top">
        {canEdit ? (
          <button aria-label="Drag card" className="kanban-drag-handle" type="button" {...attributes} {...listeners}>
            <GripVertical size={14} />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        <input
          aria-label="Card title"
          disabled={!canEdit}
          onBlur={() => void commitTitle()}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          value={title}
        />
        <button aria-label="Open card details" className="icon-button subtle" onClick={openDetails} type="button">
          <Maximize2 size={14} />
        </button>
      </div>

      {card.description?.trim() ? (
        <CardMarkdown compact text={card.description} />
      ) : (
        <button className="kanban-card-empty-detail" onClick={openDetails} type="button">
          {canEdit ? 'Add details' : 'No details yet'}
        </button>
      )}

      <div className="kanban-card-meta">
        <span className="kanban-avatar">{principalLabel(memberOptions, card.createdBy).slice(0, 1).toUpperCase()}</span>
        <span>{principalLabel(memberOptions, card.createdBy)}</span>
        <span>{readableDate(card.createdAt)}</span>
        {card.dueDateUtc !== null ? (
          <span className={overdue ? 'kanban-card-due overdue' : 'kanban-card-due'}>
            <CalendarDays size={12} />
            Due {dueDateLabel(card.dueDateUtc)}
          </span>
        ) : null}
      </div>

      {detailsOpen ? (
        <div className="kanban-card-modal-backdrop" onMouseDown={() => setDetailsOpen(false)} role="presentation">
          <section aria-label="Card details" aria-modal="true" className="kanban-card-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <header>
              <div>
                <span className="eyebrow">Card details</span>
                <input aria-label="Card detail title" disabled={!canEdit} onChange={(event) => setTitle(event.currentTarget.value)} value={title} />
              </div>
              <button aria-label="Close card details" className="icon-button subtle" onClick={() => setDetailsOpen(false)} type="button">
                <X size={18} />
              </button>
            </header>

            <dl className="kanban-card-detail-grid">
              <div>
                <dt>Creator</dt>
                <dd>{principalLabel(memberOptions, card.createdBy)}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{readableDate(card.createdAt)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{readableDate(card.updatedAt)}</dd>
              </div>
              <div>
                <dt>Due date</dt>
                <dd><input aria-label="Card due date" disabled={!canEdit} onChange={(event) => setDueDate(event.currentTarget.value)} type="date" value={dueDate} /></dd>
              </div>
              <div>
                <dt>Assignees</dt>
                <dd>
                  <select
                    aria-label="Card assignees"
                    disabled={!canEdit}
                    multiple
                    onChange={(event) => setAssignedTo(selectValues(event.currentTarget.options))}
                    value={assignedTo}
                  >
                    {memberOptions.map((member) => (
                      <option key={member.principal.toText()} value={member.principal.toText()}>
                        {principalLabel(memberOptions, member.principal)}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div>
                <dt>Linked document</dt>
                <dd>
                  <select aria-label="Linked document" disabled={!canEdit} onChange={(event) => setDocId(event.currentTarget.value)} value={docId}>
                    <option value="">No linked document</option>
                    {documents.map((document) => (
                      <option key={document.id.toString()} value={document.id.toString()}>{document.title}</option>
                    ))}
                  </select>
                  {documentLink ? (
                    <a className="kanban-linked-resource" href={routePaths.document(communityId, documentLink.id)}>
                      <FileText size={14} />
                      Open document
                    </a>
                  ) : card.docId !== null ? <p className="inline-error">Linked document is not visible.</p> : null}
                </dd>
              </div>
              <div>
                <dt>Linked event</dt>
                <dd>
                  <select aria-label="Linked event" disabled={!canEdit} onChange={(event) => setEventId(event.currentTarget.value)} value={eventId}>
                    <option value="">No linked event</option>
                    {events.map((event) => (
                      <option key={event.id.toString()} value={event.id.toString()}>{event.title}</option>
                    ))}
                  </select>
                  {eventLink ? (
                    <a className="kanban-linked-resource" href={routePaths.event(communityId, eventLink.id)}>
                      <CalendarDays size={14} />
                      Open event
                    </a>
                  ) : card.eventId !== null ? <p className="inline-error">Linked event is not visible.</p> : null}
                </dd>
              </div>
            </dl>

            <div className="kanban-card-mode-toggle" role="group" aria-label="Description mode">
              <button className={detailsMode === 'preview' ? 'selected' : ''} onClick={() => setDetailsMode('preview')} type="button">Preview</button>
              {canEdit ? (
                <button className={detailsMode === 'edit' ? 'selected' : ''} onClick={() => setDetailsMode('edit')} title="Edit Markdown syntax" type="button">
                  <Code2 size={15} />
                  Edit
                </button>
              ) : null}
            </div>

            {detailsMode === 'edit' && canEdit ? (
              <textarea
                aria-label="Card markdown description"
                onChange={(event) => setDescription(event.currentTarget.value)}
                placeholder="Add Markdown details. Use # for headings, - for lists, [text](url) for links, and ![alt](url) for images."
                value={description}
              />
            ) : (
              <div className="kanban-card-preview-panel">
                {description.trim() ? <CardMarkdown text={description} /> : <p className="muted">No description yet.</p>}
              </div>
            )}

            {saveError ? <p className="inline-error">{saveError}</p> : null}

            <footer>
              {canEdit ? (
                <button className="ghost-button danger" onClick={() => onDelete(card.id)} type="button">
                  <Trash2 size={16} />
                  Delete
                </button>
              ) : <span />}
              <div>
                <button className="ghost-button" onClick={() => setDetailsOpen(false)} type="button">Cancel</button>
                {canEdit ? (
                  <button
                    className="btn-primary rounded-full px-4 py-2 text-sm"
                    disabled={isSaving || (nextFields().title === card.title && nextFields().description === card.description && nextFields().docId === card.docId && nextFields().eventId === card.eventId && nextFields().dueDateUtc === card.dueDateUtc && samePrincipalList(nextFields().assignedTo, card.assignedTo))}
                    onClick={() => void saveDetails()}
                    type="button"
                  >
                    <Save size={16} />
                    {isSaving ? 'Saving...' : 'Save card'}
                  </button>
                ) : null}
              </div>
            </footer>
          </section>
        </div>
      ) : null}
    </article>
  );
}

export function inputForCard(card: KanbanCardType, fields: KanbanCardUpdateFields): KanbanCardInput {
  return {
    title: fields.title,
    description: fields.description,
    assignedTo: fields.assignedTo,
    docId: fields.docId,
    eventId: fields.eventId,
    dueDateUtc: fields.dueDateUtc,
  };
}
