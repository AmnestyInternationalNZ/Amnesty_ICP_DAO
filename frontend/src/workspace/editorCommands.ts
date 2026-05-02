import type { WorkspaceBlockType } from "./types";

export interface BlockCommand {
  type: WorkspaceBlockType;
  label: string;
  hint: string;
  group: "Text" | "Lists" | "Structure" | "Media";
  aliases: string[];
  markdown?: string;
}

export interface MarkdownShortcutResult {
  type: WorkspaceBlockType;
  text: string;
  checked?: boolean;
}

export const SLASH_COMMANDS: BlockCommand[] = [
  { type: "paragraph", label: "Text", hint: "Plain paragraph", group: "Text", aliases: ["plain", "p"], markdown: "text" },
  { type: "heading1", label: "Heading 1", hint: "Large section title", group: "Text", aliases: ["h1", "title"], markdown: "# " },
  { type: "heading2", label: "Heading 2", hint: "Medium section title", group: "Text", aliases: ["h2", "subtitle"], markdown: "## " },
  { type: "heading3", label: "Heading 3", hint: "Small section title", group: "Text", aliases: ["h3"], markdown: "### " },
  { type: "bullet", label: "Bullet list", hint: "Simple list item", group: "Lists", aliases: ["ul", "list"], markdown: "- " },
  { type: "numbered", label: "Numbered list", hint: "Ordered list item", group: "Lists", aliases: ["ol", "ordered"], markdown: "1. " },
  { type: "checklist", label: "Checklist", hint: "Track a task", group: "Lists", aliases: ["todo", "to-do", "task"], markdown: "[ ] " },
  { type: "quote", label: "Quote", hint: "Indented quote", group: "Structure", aliases: ["blockquote"], markdown: "> " },
  { type: "callout", label: "Callout", hint: "Light note box", group: "Structure", aliases: ["note", "aside"] },
  { type: "toggle", label: "Toggle", hint: "Collapsible section", group: "Structure", aliases: ["details", "collapse"] },
  { type: "divider", label: "Divider", hint: "Horizontal rule", group: "Structure", aliases: ["hr", "line"], markdown: "---" },
  { type: "image", label: "Image", hint: "External image URL", group: "Media", aliases: ["photo", "picture"] },
  { type: "fileLink", label: "File link", hint: "External file URL", group: "Media", aliases: ["file", "attachment", "link"] },
];

export function commandForBlockType(type: WorkspaceBlockType): BlockCommand {
  return SLASH_COMMANDS.find((command) => command.type === type) ?? SLASH_COMMANDS[0];
}

export function shouldOpenSlashMenu(key: string, currentText: string): boolean {
  return key === "/" && currentText.length === 0;
}

export function slashQueryForText(text: string): string {
  return text.startsWith("/") ? text.slice(1).trim().toLowerCase() : "";
}

export function filterSlashCommands(query: string): BlockCommand[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return SLASH_COMMANDS;

  return SLASH_COMMANDS.filter((command) => {
    const haystack = [command.label, command.hint, command.type, command.group, ...command.aliases]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}

export function markdownShortcutForText(text: string): MarkdownShortcutResult | undefined {
  if (text === "# ") return { type: "heading1", text: "" };
  if (text === "## ") return { type: "heading2", text: "" };
  if (text === "### ") return { type: "heading3", text: "" };
  if (text === "- " || text === "* ") return { type: "bullet", text: "" };
  if (text === "1. ") return { type: "numbered", text: "" };
  if (text === "[] " || text === "[ ] ") return { type: "checklist", text: "", checked: false };
  if (text.toLowerCase() === "[x] ") return { type: "checklist", text: "", checked: true };
  if (text === "> ") return { type: "quote", text: "" };
  if (text === "---") return { type: "divider", text: "" };
  return undefined;
}

export function nextBlockTypeAfterEnter(type: WorkspaceBlockType): WorkspaceBlockType {
  if (
    type === "heading1" ||
    type === "heading2" ||
    type === "heading3" ||
    type === "quote" ||
    type === "divider" ||
    type === "toggle" ||
    type === "image" ||
    type === "fileLink"
  ) {
    return "paragraph";
  }
  return type;
}

export function isTextEditableBlock(type: WorkspaceBlockType): boolean {
  return type !== "divider" && type !== "image" && type !== "fileLink";
}

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_URL_PUNCTUATION = /[),.;:!?]+$/;

export interface TextSegment {
  text: string;
  href?: string;
}

export function normalizeHyperlink(candidate: string): string | undefined {
  const trimmed = candidate.trim().replace(TRAILING_URL_PUNCTUATION, "");
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function firstValidHyperlink(text: string): string | undefined {
  for (const match of text.matchAll(URL_PATTERN)) {
    const href = normalizeHyperlink(match[0]);
    if (href) return href;
  }
  return undefined;
}

export function linkifyText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const href = normalizeHyperlink(raw);
    if (!href) continue;

    const linkedText = raw.replace(TRAILING_URL_PUNCTUATION, "");
    const end = start + linkedText.length;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: linkedText, href });
    cursor = end;
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length > 0 ? segments : [{ text }];
}
