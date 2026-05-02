import type { WorkspaceBlock, WorkspaceTextMark } from "./types";

type ImportedBlock = Omit<WorkspaceBlock, "id">;

function indentFromLine(line: string): number {
  const spaces = line.match(/^\s*/)?.[0].length ?? 0;
  return Math.max(0, Math.min(3, Math.floor(spaces / 2)));
}

function parseInlineMarkdown(raw: string): Pick<ImportedBlock, "text" | "inlineMarks"> {
  let text = "";
  const inlineMarks: WorkspaceTextMark[] = [];
  let index = 0;

  function consumeMarked(delimiter: string, type: "bold" | "italic"): boolean {
    if (!raw.startsWith(delimiter, index)) return false;
    const end = raw.indexOf(delimiter, index + delimiter.length);
    if (end < 0) return false;

    const content = raw.slice(index + delimiter.length, end);
    if (!content) return false;

    const start = text.length;
    text += content;
    inlineMarks.push({
      id: `imported-${type}-${start}-${text.length}`,
      type,
      start,
      end: text.length,
    });
    index = end + delimiter.length;
    return true;
  }

  while (index < raw.length) {
    if (consumeMarked("**", "bold") || consumeMarked("__", "bold")) continue;
    if (consumeMarked("*", "italic") || consumeMarked("_", "italic")) continue;
    text += raw[index];
    index += 1;
  }

  return { text, inlineMarks: inlineMarks.length > 0 ? inlineMarks : undefined };
}

function textBlock(type: ImportedBlock["type"], rawText: string, indent: number, extra: Partial<ImportedBlock> = {}): ImportedBlock {
  const parsed = parseInlineMarkdown(rawText);
  return {
    text: parsed.text,
    type,
    indent,
    inlineMarks: parsed.inlineMarks,
    ...extra,
  };
}

function imageBlock(line: string, indent: number): ImportedBlock | undefined {
  const match = line.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);
  if (!match) return undefined;
  return {
    text: match[1] || "Image",
    type: "image",
    indent,
    url: match[2],
    caption: match[1],
  };
}

function fileLinkBlock(line: string, indent: number): ImportedBlock | undefined {
  const match = line.match(/^\[([^\]]+)\]\(([^)]*)\)$/);
  if (!match) return undefined;
  return {
    text: match[1],
    type: "fileLink",
    indent,
    url: match[2],
  };
}

export function markdownToBlocks(markdown: string): ImportedBlock[] {
  const blocks: ImportedBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    blocks.push(textBlock("paragraph", paragraph.join(" "), 0));
    paragraph = [];
  }

  for (const originalLine of lines) {
    const line = originalLine.replace(/\s+$/, "");
    const trimmed = line.trim();
    const indent = indentFromLine(line);

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed === "</details>") {
      flushParagraph();
      continue;
    }

    const summaryMatch = trimmed.match(/^<summary>(.*)<\/summary>$/);
    if (summaryMatch) {
      flushParagraph();
      blocks.push(textBlock("toggle", summaryMatch[1] || "Toggle", indent));
      continue;
    }

    if (trimmed.startsWith("<details")) {
      flushParagraph();
      continue;
    }

    if (trimmed === "---") {
      flushParagraph();
      blocks.push({ text: "", type: "divider", indent });
      continue;
    }

    const image = imageBlock(trimmed, indent);
    if (image) {
      flushParagraph();
      blocks.push(image);
      continue;
    }

    const fileLink = fileLinkBlock(trimmed, indent);
    if (fileLink) {
      flushParagraph();
      blocks.push(fileLink);
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      blocks.push(textBlock("heading3", trimmed.slice(4), indent));
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      blocks.push(textBlock("heading2", trimmed.slice(3), indent));
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      blocks.push(textBlock("heading1", trimmed.slice(2), indent));
      continue;
    }

    const checklistMatch = trimmed.match(/^- \[([ xX])\]\s+(.*)$/);
    if (checklistMatch) {
      flushParagraph();
      blocks.push(textBlock("checklist", checklistMatch[2], indent, { checked: checklistMatch[1].toLowerCase() === "x" }));
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      flushParagraph();
      blocks.push(textBlock("bullet", bulletMatch[1], indent));
      continue;
    }

    const numberedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      flushParagraph();
      blocks.push(textBlock("numbered", numberedMatch[1], indent));
      continue;
    }

    if (trimmed.startsWith("> [!NOTE] ")) {
      flushParagraph();
      blocks.push(textBlock("callout", trimmed.slice(10), indent));
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      blocks.push(textBlock("quote", trimmed.slice(2), indent));
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  return blocks.length > 0 ? blocks : [{ text: "", type: "paragraph" }];
}
