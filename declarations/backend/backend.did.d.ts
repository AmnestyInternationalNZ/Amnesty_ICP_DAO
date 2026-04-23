import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Community {
  'id' : bigint,
  'members' : Array<Principal>,
  'admin' : Principal,
  'name' : string,
  'policy' : string,
}
export interface Proposal {
  'id' : bigint,
  'no' : bigint,
  'yes' : bigint,
  'title' : string,
  'creator' : Principal,
  'communityId' : bigint,
  'startNs' : bigint,
  'description' : string,
  'endNs' : bigint,
  'passPct' : bigint,
  'state' : ProposalState,
  'quorum' : bigint,
}
export interface ProposalOverrides {
  'passPct' : [] | [bigint],
  'windowNs' : [] | [bigint],
  'quorum' : [] | [bigint],
}
export type ProposalState = { 'active' : null } |
  { 'pendingFinalization' : null } |
  { 'failed' : null } |
  { 'passed' : null };
export interface UserProfile { 'name' : string }
export type UserRole = { 'admin' : null } |
  { 'user' : null } |
  { 'guest' : null };
export interface _SERVICE {
  'assignCallerUserRole' : ActorMethod<[Principal, UserRole], undefined>,
  'createCommunity' : ActorMethod<[string, string], undefined>,
  'createProposal' : ActorMethod<
    [bigint, string, string, [] | [ProposalOverrides]],
    undefined
  >,
  'enterCommunityPortal' : ActorMethod<[bigint], Community>,
  'finalizeProposal' : ActorMethod<[bigint], undefined>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCallerUserRole' : ActorMethod<[], UserRole>,
  'getCommunityById' : ActorMethod<[bigint], [] | [Community]>,
  'getProposalById' : ActorMethod<[bigint], [] | [Proposal]>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'initializeAccessControl' : ActorMethod<[], undefined>,
  'isCallerAdmin' : ActorMethod<[], boolean>,
  'joinCommunity' : ActorMethod<[bigint], undefined>,
  'leaveCommunity' : ActorMethod<[bigint], undefined>,
  'listAllUsers' : ActorMethod<[], Array<[Principal, UserProfile]>>,
  'listCommunities' : ActorMethod<[], Array<Community>>,
  'listProposalsByCommunity' : ActorMethod<[bigint], Array<Proposal>>,
  'removeMemberFromCommunity' : ActorMethod<[bigint, Principal], undefined>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'voteOnProposal' : ActorMethod<[bigint, boolean], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
