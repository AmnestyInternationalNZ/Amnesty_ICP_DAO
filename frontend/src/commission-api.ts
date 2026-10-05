import {
  Actor,
  HttpAgent,
  type Identity as AgentIdentity,
} from "@icp-sdk/core/agent";
import { idlFactory } from "./declarations/backend.did";
import type { _SERVICE } from "./declarations/backend.did";
import { loadConfig } from "./config";
import type { AuthClient } from "@dfinity/auth-client";
type Identity = ReturnType<AuthClient["getIdentity"]>;
export async function commissionActor(identity?: Identity): Promise<_SERVICE> {
  const config = await loadConfig();
  const agent = new HttpAgent({
    host: config.backend_host,
    // AuthClient and the SDK share the runtime Identity protocol.
    identity: identity as unknown as AgentIdentity,
    verifyQuerySignatures:
      config.backend_host?.includes("localhost") ||
      config.backend_host?.includes("127.0.0.1")
        ? false
        : true,
  });
  if (
    config.backend_host &&
    /^https?:\/\/(localhost|127\.0\.0\.1|[^/]+\.localhost)(:|\/|$)/.test(
      config.backend_host,
    )
  )
    await agent.fetchRootKey();
  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId: config.backend_canister_id,
  });
}
export function newReturnCredential(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const commissionMode = import.meta.env.VITE_APP_MODE !== "dao";
