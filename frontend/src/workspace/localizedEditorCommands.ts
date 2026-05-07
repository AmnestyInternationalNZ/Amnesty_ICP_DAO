import type { TFunction } from 'i18next';
import type { BlockCommand } from './editorCommands';
import type { WorkspaceBlockType } from './types';

export function blockCommandLabel(command: BlockCommand, t: TFunction): string {
  return t(`workspace.commands.items.${command.type}.label`, { defaultValue: command.label });
}

export function blockCommandHint(command: BlockCommand, t: TFunction): string {
  return t(`workspace.commands.items.${command.type}.hint`, { defaultValue: command.hint });
}

export function blockCommandGroup(command: BlockCommand, t: TFunction): string {
  return t(`workspace.commands.groups.${command.group}`, { defaultValue: command.group });
}

export function blockTypeLabel(type: WorkspaceBlockType, t: TFunction): string {
  return t(`workspace.commands.items.${type}.label`, { defaultValue: type });
}

const SYNC_STATUS_KEYS: Record<string, string> = {
  Loaded: 'loaded',
  'Unsaved changes': 'unsavedChanges',
  Saving: 'saving',
  Persisted: 'persisted',
  'Save error': 'saveError',
  Compacting: 'compacting',
  Compacted: 'compacted',
  'Compact error': 'compactError',
  'Title saved': 'titleSaved',
};

export function syncStatusLabel(status: string, t: TFunction): string {
  const key = SYNC_STATUS_KEYS[status];
  return key ? t(`workspace.syncStatus.${key}`, { defaultValue: status }) : status;
}
