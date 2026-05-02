export type WorkspacePinKind = "workspace-doc" | "board";

function pinKey(kind: WorkspacePinKind, principal: string): string {
  return `kamu.${principal}.pinned.${kind}`;
}

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function readPinnedId(kind: WorkspacePinKind, principal?: string): bigint | undefined {
  if (!principal) return undefined;
  const value = storage()?.getItem(pinKey(kind, principal));
  if (!value) return undefined;

  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

export function writePinnedId(kind: WorkspacePinKind, principal: string | undefined, id?: bigint): bigint | undefined {
  if (!principal) return undefined;
  const nextStorage = storage();
  if (!nextStorage) return undefined;

  if (id === undefined) {
    nextStorage.removeItem(pinKey(kind, principal));
    return undefined;
  }

  nextStorage.setItem(pinKey(kind, principal), id.toString());
  return id;
}
