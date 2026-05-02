import type { WorkspaceBlock } from "./types";

export interface NumberedListMarker {
  value: number;
  label: string;
  style: "decimal" | "lower-alpha" | "lower-roman";
}

function normalizedIndent(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(3, Math.trunc(value)));
}

function toAlpha(value: number): string {
  let remaining = Math.max(1, value);
  let label = "";

  while (remaining > 0) {
    remaining -= 1;
    label = String.fromCharCode(97 + (remaining % 26)) + label;
    remaining = Math.floor(remaining / 26);
  }

  return label;
}

function toRoman(value: number): string {
  const numerals: Array<[number, string]> = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let remaining = Math.max(1, value);
  let label = "";

  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      label += numeral;
      remaining -= amount;
    }
  }

  return label;
}

export function numberedMarkerStyleForIndent(indent: number): NumberedListMarker["style"] {
  const normalized = normalizedIndent(indent) % 3;
  if (normalized === 1) return "lower-alpha";
  if (normalized === 2) return "lower-roman";
  return "decimal";
}

export function formatNumberedMarker(value: number, indent: number): string {
  const style = numberedMarkerStyleForIndent(indent);
  if (style === "lower-alpha") return `${toAlpha(value)}.`;
  if (style === "lower-roman") return `${toRoman(value)}.`;
  return `${Math.max(1, value)}.`;
}

export function computeNumberedListMarkers(
  blocks: Array<Pick<WorkspaceBlock, "id" | "type" | "indent" | "numbering">>,
): Record<string, NumberedListMarker> {
  const markers: Record<string, NumberedListMarker> = {};
  const activeCounters = new Map<number, number>();
  const lastSeenCounters = new Map<number, number>();

  function clearActiveCountersFrom(indent: number) {
    for (const activeIndent of [...activeCounters.keys()]) {
      if (activeIndent >= indent) activeCounters.delete(activeIndent);
    }
  }

  function clearDeeperActiveCounters(indent: number) {
    for (const activeIndent of [...activeCounters.keys()]) {
      if (activeIndent > indent) activeCounters.delete(activeIndent);
    }
  }

  for (const block of blocks) {
    const indent = normalizedIndent(block.indent);

    if (block.type !== "numbered") {
      clearActiveCountersFrom(indent);
      continue;
    }

    clearDeeperActiveCounters(indent);

    const current = activeCounters.get(indent) ?? 0;
    const value =
      block.numbering === "restart"
        ? 1
        : block.numbering === "continue" && current === 0
          ? (lastSeenCounters.get(indent) ?? 0) + 1
          : current + 1;

    const style = numberedMarkerStyleForIndent(indent);
    activeCounters.set(indent, value);
    lastSeenCounters.set(indent, value);
    markers[block.id] = {
      value,
      style,
      label: formatNumberedMarker(value, indent),
    };
  }

  return markers;
}
