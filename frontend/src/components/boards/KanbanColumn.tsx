import React, { useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CommunityDocumentSummary, CommunityEventPayload, CommunityMember, KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType } from '../../backend';
import KanbanCard, { cardKey, type KanbanCardUpdateFields } from './KanbanCard';

export function columnKey(columnId: bigint): string {
  return `column:${columnId.toString()}`;
}

export function parseColumnKey(value: string): bigint | undefined {
  if (!value.startsWith('column:')) return undefined;
  const id = value.slice('column:'.length);
  if (!/^\d+$/.test(id)) return undefined;
  return BigInt(id);
}

export function columnDropKey(columnId: bigint): string {
  return `column-drop:${columnId.toString()}`;
}

export function parseColumnDropKey(value: string): bigint | undefined {
  if (!value.startsWith('column-drop:')) return undefined;
  const id = value.slice('column-drop:'.length);
  if (!/^\d+$/.test(id)) return undefined;
  return BigInt(id);
}

export default function KanbanColumn({
  canEdit,
  cards,
  column,
  communityId,
  documents,
  events,
  memberOptions,
  onAddCard,
  onDeleteCard,
  onDeleteColumn,
  onRenameColumn,
  onUpdateCard,
}: {
  canEdit: boolean;
  cards: KanbanCardType[];
  column: KanbanColumnType;
  communityId: bigint;
  documents: CommunityDocumentSummary[];
  events: CommunityEventPayload[];
  memberOptions: CommunityMember[];
  onAddCard: (columnId: bigint, title: string) => void;
  onDeleteCard: (cardId: bigint) => void;
  onDeleteColumn: (columnId: bigint) => void;
  onRenameColumn: (columnId: bigint, title: string) => void;
  onUpdateCard: (cardId: bigint, fields: KanbanCardUpdateFields) => Promise<boolean | void> | boolean | void;
}) {
  const { t } = useTranslation();
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: columnKey(column.id),
    data: { kind: 'column', columnId: column.id },
    disabled: !canEdit,
  });
  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: columnDropKey(column.id),
    data: { kind: 'column-drop', columnId: column.id },
    disabled: !canEdit,
  });
  const [title, setTitle] = useState(column.title);
  const [newCardTitle, setNewCardTitle] = useState('');

  useEffect(() => {
    setTitle(column.title);
  }, [column.id, column.title]);

  function commitTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(column.title);
      return;
    }
    if (trimmed !== column.title) {
      onRenameColumn(column.id, trimmed);
    }
  }

  function addCard() {
    const trimmed = newCardTitle.trim();
    if (!trimmed) return;
    onAddCard(column.id, trimmed);
    setNewCardTitle('');
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <section className={[isDragging ? 'kanban-column dragging' : 'kanban-column', isOver ? 'drop-target' : ''].filter(Boolean).join(' ')} ref={setNodeRef} style={style}>
      <header className="kanban-column-head">
        {canEdit ? (
          <button aria-label={t('boards.column.dragColumn')} className="kanban-drag-handle" type="button" {...attributes} {...listeners}>
            <GripVertical size={14} />
          </button>
        ) : null}
        <input
          aria-label={t('boards.column.title')}
          disabled={!canEdit}
          onBlur={commitTitle}
          onChange={(event) => setTitle(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          value={title}
        />
        <span>{cards.length}</span>
        {canEdit ? (
          <button
            aria-label={t('boards.column.deleteEmpty')}
            className="icon-button subtle"
            disabled={column.cardIds.length > 0}
            onClick={() => onDeleteColumn(column.id)}
            title={column.cardIds.length > 0 ? t('boards.column.moveCardsBeforeDelete') : t('boards.column.deleteColumn')}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </header>

      {canEdit ? (
        <div className="kanban-add-card">
          <input
            aria-label={t('boards.column.addCardTo', { columnTitle: column.title })}
            onChange={(event) => setNewCardTitle(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addCard();
            }}
            placeholder={t('boards.actions.addCard')}
            value={newCardTitle}
          />
          <button disabled={!newCardTitle.trim()} onClick={addCard} type="button">
            <Plus size={15} />
            {t('boards.actions.addCard')}
          </button>
        </div>
      ) : null}

      <div className="kanban-card-list" ref={setDropRef}>
        <SortableContext items={cards.map((card) => cardKey(card.id))} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              canEdit={canEdit}
              card={card}
              communityId={communityId}
              documents={documents}
              events={events}
              key={card.id.toString()}
              memberOptions={memberOptions}
              onDelete={onDeleteCard}
              onUpdate={onUpdateCard}
            />
          ))}
        </SortableContext>
      </div>
    </section>
  );
}
