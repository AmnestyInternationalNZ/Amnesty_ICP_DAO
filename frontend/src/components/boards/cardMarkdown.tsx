import MarkdownContent from '../MarkdownContent';

export default function CardMarkdown({ compact = false, text }: { compact?: boolean; text: string }) {
  return (
    <MarkdownContent
      checklistItemClassName="kanban-checklist-item"
      className={compact ? 'kanban-markdown compact' : 'kanban-markdown'}
      text={text}
    />
  );
}
