import { AnonymousIdentity, type Identity } from '@icp-sdk/core/agent';
import { PocketIc, createIdentity, type Actor as PocketIcActor } from '@dfinity/pic';
import { Principal as DfinityPrincipal } from '@dfinity/principal';
import { resolve } from 'node:path';
import { inject } from 'vitest';
import type { Principal } from '@icp-sdk/core/principal';

import { idlFactory } from '../../declarations/backend/backend.did.js';
import type { _SERVICE } from '../../declarations/backend/backend.did';

const BACKEND_WASM_PATH = resolve(process.cwd(), '.icp/cache/artifacts/backend');

export type BackendFixture = {
  pic: PocketIc;
  actor: PocketIcActor<_SERVICE>;
  canisterId: Principal;
  adminIdentity: Identity;
  memberIdentity: Identity;
  outsiderIdentity: Identity;
  anonymousIdentity: AnonymousIdentity;
};

export async function createBackendFixture(): Promise<BackendFixture> {
  const picUrl = inject('PIC_URL' as never) as string | undefined;
  if (typeof picUrl !== 'string' || picUrl.length === 0) {
    throw new Error('PIC_URL was not provided by the test setup');
  }

  const pic = await PocketIc.create(picUrl);
  const canister = await pic.setupCanister<_SERVICE>({
    idlFactory,
    wasm: BACKEND_WASM_PATH,
  });

  return {
    pic,
    actor: canister.actor,
    canisterId: canister.canisterId,
    adminIdentity: createIdentity('amnesty-admin'),
    memberIdentity: createIdentity('amnesty-member'),
    outsiderIdentity: createIdentity('amnesty-outsider'),
    anonymousIdentity: new AnonymousIdentity(),
  };
}

export function actorFor(
  fixture: BackendFixture,
  identity: Identity,
): PocketIcActor<_SERVICE> {
  const actor = fixture.pic.createActor<_SERVICE>(idlFactory, fixture.canisterId);
  actor.setIdentity(identity);
  return actor;
}

export function principalText(identity: Identity): string {
  return identity.getPrincipal().toText();
}

export function candidPrincipal(identity: Identity): DfinityPrincipal {
  return DfinityPrincipal.fromText(identity.getPrincipal().toText());
}

export function communityRoleKey(role: { member: null } | { communityAdmin: null }): 'member' | 'communityAdmin' {
  if ('communityAdmin' in role) {
    return 'communityAdmin';
  }

  return 'member';
}
