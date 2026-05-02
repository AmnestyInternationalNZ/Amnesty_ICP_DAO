import { firstValidHyperlink } from "./editorCommands";
import { computeNumberedListMarkers } from "./numberedLists";
import type { WorkspaceBlock, WorkspaceTextMark } from "./types";

function mdEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function lineIndent(block: WorkspaceBlock): string {
  return "  ".repeat(block.indent ?? 0);
}

function mediaUrl(block: WorkspaceBlock): string {
  return block.url?.trim() || firstValidHyperlink(block.text) || "";
}

function markdownText(block: WorkspaceBlock): string {
  let text = block.text || "";
  const marks = (block.inlineMarks ?? [])
    .filter((mark): mark is WorkspaceTextMark => mark.type === "bold" || mark.type === "italic")
    .sort((a, b) => b.start - a.start || b.end - a.end);

  for (const mark of marks) {
    const start = Math.max(0, Math.min(text.length, mark.start));
    const end = Math.max(0, Math.min(text.length, mark.end));
    if (end <= start) continue;
    const delimiter = mark.type === "bold" ? "**" : "*";
    text = `${text.slice(0, start)}${delimiter}${text.slice(start, end)}${delimiter}${text.slice(end)}`;
  }

  return text;
}

export function blocksToMarkdown(blocks: WorkspaceBlock[]): string {
  const lines: string[] = [];
  const toggleStack: number[] = [];
  const numberedMarkers = computeNumberedListMarkers(blocks);

  function closeToggles(nextIndent = 0) {
    while (toggleStack.length > 0 && toggleStack[toggleStack.length - 1] >= nextIndent) {
      const indent = toggleStack.pop() ?? 0;
      lines.push(`${"  ".repeat(indent)}</details>`);
      lines.push("");
    }
  }

  for (const block of blocks) {
    const indentLevel = block.indent ?? 0;
    const indent = lineIndent(block);
    closeToggles(indentLevel);

    if (block.type === "divider") {
      lines.push(`${indent}---`);
      lines.push("");
      continue;
    }

    if (block.type === "toggle") {
      lines.push(`${indent}<details${block.collapsed ? "" : " open"}>`);
      lines.push(`${indent}<summary>${mdEscape(block.text || "Toggle")}</summary>`);
      lines.push("");
      toggleStack.push(indentLevel);
      continue;
    }

    if (block.type === "image") {
      const url = mediaUrl(block);
      const caption = block.caption?.trim() || block.text.trim() || "Image";
      lines.push(url ? `${indent}![${mdEscape(caption)}](${url})` : `${indent}![${mdEscape(caption)}]()`);
      lines.push("");
      continue;
    }

    if (block.type === "fileLink") {
      const url = mediaUrl(block);
      const label = block.text.trim() || block.caption?.trim() || url || "File link";
      lines.push(url ? `${indent}[${mdEscape(label)}](${url})` : `${indent}${mdEscape(label)}`);
      lines.push("");
      continue;
    }

    const text = markdownText(block);
    if (block.type === "heading1") lines.push(`${indent}# ${text}`);
    else if (block.type === "heading2") lines.push(`${indent}## ${text}`);
    else if (block.type === "heading3") lines.push(`${indent}### ${text}`);
    else if (block.type === "bullet") lines.push(`${indent}- ${text}`);
    else if (block.type === "numbered") lines.push(`${indent}${numberedMarkers[block.id]?.label ?? "1."} ${text}`);
    else if (block.type === "checklist") lines.push(`${indent}- [${block.checked ? "x" : " "}] ${text}`);
    else if (block.type === "quote") lines.push(`${indent}> ${text}`);
    else if (block.type === "callout") lines.push(`${indent}> [!NOTE] ${text}`);
    else lines.push(`${indent}${text}`);

    lines.push("");
  }

  closeToggles(0);
  return `${lines.join("\n").trimEnd()}\n`;
}
