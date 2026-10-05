import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// icp's Motoko recipe embeds the configured Candid file, so regenerate it from source first.
const dir = mkdtempSync(join(tmpdir(), "amnesty-candid-"));
try {
  const sources = execFileSync("pnpm", ["exec", "mops", "sources"], {
    encoding: "utf8",
  })
    .trim()
    .split(/\s+/);
  execFileSync(
    "pnpm",
    [
      "exec",
      "moc-wrapper",
      "--idl",
      ...sources,
      "backend/main.mo",
      "-o",
      join(dir, "backend.wasm"),
    ],
    { stdio: "inherit" },
  );
  writeFileSync(
    "declarations/backend/backend.did",
    readFileSync(join(dir, "backend.did"), "utf8").replace(/[ \t]+$/gm, ""),
  );
  const js = execFileSync(
    "didc",
    ["bind", "-t", "js", "declarations/backend/backend.did"],
    { encoding: "utf8" },
  );
  const ts = execFileSync(
    "didc",
    ["bind", "-t", "ts", "declarations/backend/backend.did"],
    { encoding: "utf8" },
  )
    .replaceAll("'@dfinity/agent'", "'@icp-sdk/core/agent'")
    .replaceAll("'@dfinity/candid'", "'@icp-sdk/core/candid'");
  for (const prefix of [
    "declarations/backend/backend.did",
    "frontend/src/declarations/backend.did",
  ]) {
    writeFileSync(`${prefix}.js`, js);
    writeFileSync(`${prefix}.d.ts`, ts);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
