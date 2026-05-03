import { WorkspaceRole } from '../backend';
import type { CommunityDocumentSummary } from '../backend';

export type WorkspaceRoleName = 'owner' | 'editor' | 'viewer';

export function readableDate(value: bigint, locale?: string): string {
  const millis = Number(value / BigInt(1_000_000));
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(millis));
}

export function roleName(role: WorkspaceRole): WorkspaceRoleName {
  if (role === WorkspaceRole.owner) return 'owner';
  if (role === WorkspaceRole.editor) return 'editor';
  return 'viewer';
}

export function roleVariant(role: WorkspaceRoleName): WorkspaceRole {
  if (role === 'owner') return WorkspaceRole.owner;
  if (role === 'editor') return WorkspaceRole.editor;
  return WorkspaceRole.viewer;
}

export function canEditWorkspaceRole(role?: WorkspaceRole | null): boolean {
  return role === WorkspaceRole.owner || role === WorkspaceRole.editor;
}

export function canOwnWorkspaceRole(role?: WorkspaceRole | null): boolean {
  return role === WorkspaceRole.owner;
}

export function sortDocs(docs: CommunityDocumentSummary[]): CommunityDocumentSummary[] {
  return [...docs].sort((a, b) => Number(b.updatedAt - a.updatedAt));
}

export function principalText(value: unknown): string {
  if (value && typeof (value as { toText?: unknown }).toText === 'function') {
    return (value as { toText: () => string }).toText();
  }
  return String(value);
}

export function compactPrincipal(value: unknown): string {
  const text = principalText(value);
  if (text.length <= 22) return text;
  return `${text.slice(0, 10)}...${text.slice(-8)}`;
}

export function bigintJsonReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function downloadJson(fileName: string, payload: unknown) {
  downloadBlob(
    fileName,
    new Blob([`${JSON.stringify(payload, bigintJsonReplacer, 2)}\n`], {
      type: 'application/json',
    }),
  );
}

export function downloadText(fileName: string, text: string, type = 'text/plain') {
  downloadBlob(fileName, new Blob([text], { type }));
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
