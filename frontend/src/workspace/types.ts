import type { Principal } from "@dfinity/principal";

export type WorkspaceRoleName = "owner" | "editor" | "viewer";

export type WorkspaceRole = {
  [K in WorkspaceRoleName]?: null;
};

export interface DocSummary {
  id: bigint;
  communityId: bigint;
  title: string;
  owner: Principal;
  createdAt: bigint;
  updatedAt: bigint;
  archived: boolean;
  version: bigint;
  role: WorkspaceRole;
  communityShare: [] | [WorkspaceRole];
  parentId: [] | [bigint];
}

export interface DocPayload extends DocSummary {
  snapshot: [] | [Uint8Array];
  updates: Uint8Array[];
  access: WorkspaceAccessEntry[];
}

export interface WorkspaceAccessEntry {
  user: Principal;
  role: WorkspaceRole;
}

export interface KanbanColumn {
  id: bigint;
  title: string;
  cardIds: bigint[];
}

export interface KanbanCardInput {
  title: string;
  description: [] | [string];
  assignedTo: Principal[];
  docId: [] | [bigint];
  eventId: [] | [bigint];
  dueDateUtc: [] | [bigint];
}

export interface KanbanCard extends KanbanCardInput {
  id: bigint;
  createdBy: Principal;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface BoardSummary {
  id: bigint;
  communityId: bigint;
  title: string;
  owner: Principal;
  createdAt: bigint;
  updatedAt: bigint;
  archived: boolean;
  role: WorkspaceRole;
  communityShare: [] | [WorkspaceRole];
  columnCount: bigint;
  cardCount: bigint;
}

export interface BoardPayload extends Omit<BoardSummary, "columnCount" | "cardCount"> {
  access: WorkspaceAccessEntry[];
  columns: KanbanColumn[];
  cards: KanbanCard[];
}

export type WorkspaceBlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bullet"
  | "numbered"
  | "checklist"
  | "quote"
  | "callout"
  | "divider"
  | "toggle"
  | "image"
  | "fileLink";

export interface WorkspaceBlock {
  id: string;
  text: string;
  type: WorkspaceBlockType;
  checked?: boolean;
  linkDisabled?: boolean;
  indent?: number;
  numbering?: WorkspaceNumberedListMode;
  collapsed?: boolean;
  url?: string;
  caption?: string;
  inlineMarks?: WorkspaceTextMark[];
}

export type WorkspaceNumberedListMode = "restart" | "continue";
export type WorkspaceHighlightColor = "yellow" | "green" | "blue" | "pink" | "purple";
export type WorkspaceTextMarkType = "bold" | "italic" | "highlight" | "comment";
export type WorkspaceCommentScope = "inline" | "block";

export interface WorkspaceTextMark {
  id: string;
  type: WorkspaceTextMarkType;
  start: number;
  end: number;
  commentId?: string;
  color?: WorkspaceHighlightColor;
}

export interface WorkspaceComment {
  id: string;
  blockId: string;
  text: string;
  author: string;
  createdAt: number;
  resolved: boolean;
  resolvedAt?: number;
  selectedText?: string;
  selectionStart?: number;
  selectionEnd?: number;
  commentScope?: WorkspaceCommentScope;
}

export function roleText(role: WorkspaceRole): WorkspaceRoleName {
  if ("owner" in role) return "owner";
  if ("editor" in role) return "editor";
  return "viewer";
}

export function canEditWorkspaceRole(role: WorkspaceRole): boolean {
  const roleName = roleText(role);
  return roleName === "owner" || roleName === "editor";
}

export function canOwnWorkspaceRole(role: WorkspaceRole): boolean {
  return roleText(role) === "owner";
}
