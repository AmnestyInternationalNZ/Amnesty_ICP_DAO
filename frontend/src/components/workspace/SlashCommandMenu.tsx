import type { WorkspaceBlockType } from '../../workspace/types';
import type { BlockCommand } from '../../workspace/editorCommands';
import { useTranslation } from 'react-i18next';
import { blockCommandGroup, blockCommandHint, blockCommandLabel } from '../../workspace/localizedEditorCommands';

export function SlashCommandMenu({
  commands,
  onClose,
  onHighlight,
  onSelect,
  query,
  selectedIndex,
}: {
  commands: BlockCommand[];
  onClose: () => void;
  onHighlight: (index: number) => void;
  onSelect: (type: WorkspaceBlockType) => void;
  query: string;
  selectedIndex: number;
}) {
  const { t } = useTranslation();
  const groupedCommands = commands.reduce<Record<string, BlockCommand[]>>((groups, command) => {
    const group = blockCommandGroup(command, t);
    groups[group] = [...(groups[group] ?? []), command];
    return groups;
  }, {});
  let globalIndex = -1;

  return (
    <div className="slash-menu" role="menu" aria-label={t('workspace.commands.aria')}>
      <div className="slash-menu-search">/{query || t('workspace.commands.placeholder')}</div>
      {commands.length === 0 ? <div className="slash-menu-empty">{t('workspace.commands.noMatches')}</div> : null}
      {Object.entries(groupedCommands).map(([group, groupCommands]) => (
        <div className="slash-menu-group" key={group}>
          <div className="slash-menu-head">{group}</div>
          {groupCommands.map((command) => {
            globalIndex += 1;
            const commandIndex = globalIndex;
            return (
              <button
                className={commandIndex === selectedIndex ? 'selected' : undefined}
                key={command.type}
                onClick={() => onSelect(command.type)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') onClose();
                }}
                onMouseEnter={() => onHighlight(commandIndex)}
                role="menuitem"
                type="button"
              >
                <span>{blockCommandLabel(command, t)}</span>
                <small>{command.markdown ?? blockCommandHint(command, t)}</small>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
