import type { WorkspaceBlockType } from '../../workspace/types';
import type { BlockCommand } from '../../workspace/editorCommands';

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
  const groupedCommands = commands.reduce<Record<string, BlockCommand[]>>((groups, command) => {
    groups[command.group] = [...(groups[command.group] ?? []), command];
    return groups;
  }, {});
  let globalIndex = -1;

  return (
    <div className="slash-menu" role="menu" aria-label="Block commands">
      <div className="slash-menu-search">/{query || 'commands'}</div>
      {commands.length === 0 ? <div className="slash-menu-empty">No matching commands</div> : null}
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
                <span>{command.label}</span>
                <small>{command.markdown ?? command.hint}</small>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
