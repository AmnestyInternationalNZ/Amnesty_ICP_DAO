import type { DocSummary, WorkspaceBlock } from "./types";

export interface DocumentSearchResult {
  doc: DocSummary;
  matchCount: number;
  titleMatches: number;
  contentMatches: number;
  snippet: string;
}

export function countQueryMatches(value: string, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  let count = 0;
  let index = 0;
  const haystack = value.toLowerCase();
  while (index < haystack.length) {
    const nextIndex = haystack.indexOf(needle, index);
    if (nextIndex === -1) break;
    count += 1;
    index = nextIndex + needle.length;
  }
  return count;
}

export function blockSearchText(block: WorkspaceBlock): string {
  return [block.text, block.caption, block.url].filter(Boolean).join("\n");
}

export function buildDocumentSearchResult(
  doc: DocSummary,
  blocks: WorkspaceBlock[],
  query: string,
): DocumentSearchResult | undefined {
  const titleMatches = countQueryMatches(doc.title, query);
  const contentMatches = blocks.reduce((total, block) => total + countQueryMatches(blockSearchText(block), query), 0);
  const matchCount = titleMatches + contentMatches;
  if (matchCount === 0) return undefined;

  const normalizedQuery = query.trim().toLowerCase();
  const matchingBlock = blocks.find((block) => blockSearchText(block).toLowerCase().includes(normalizedQuery));
  const rawSnippet = matchingBlock ? blockSearchText(matchingBlock) : doc.title;
  const snippet = rawSnippet.replace(/\s+/g, " ").trim().slice(0, 140);

  return {
    doc,
    matchCount,
    titleMatches,
    contentMatches,
    snippet,
  };
}
