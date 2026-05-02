import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@icp-sdk/core/agent';
import type { IDL } from '@icp-sdk/core/candid';

export interface Campaign {
  'id' : bigint,
  'title' : string,
  'creator' : Principal,
  'goalAmount' : bigint,
  'communityId' : bigint,
  'deadlineNs' : bigint,
  'createdNs' : bigint,
  'description' : string,
  'totalRaised' : bigint,
  'state' : CampaignState,
}
export type CampaignState = { 'active' : null } |
  { 'expired' : null } |
  { 'successful' : null } |
  { 'failed' : null };
export interface CampaignUpdate {
  'id' : bigint,
  'creator' : Principal,
  'content' : string,
  'campaignId' : bigint,
  'timestampNs' : bigint,
}
export interface Community {
  'id' : bigint,
  'members' : Array<Principal>,
  'admin' : Principal,
  'name' : string,
  'policy' : string,
}
export interface CommunityAccess {
  'canCreateCampaign' : boolean,
  'canContributeToCampaign' : boolean,
  'communityRole' : [] | [CommunityRole],
  'canLeaveCommunity' : boolean,
  'canManageMembership' : boolean,
  'isPlatformAdmin' : boolean,
  'canCreateProposal' : boolean,
  'canVoteOnProposal' : boolean,
}
export interface CommunityMember {
  'principal' : Principal,
  'role' : CommunityRole,
  'profile' : [] | [UserProfile],
}
export type CommunityRole = { 'member' : null } |
  { 'communityAdmin' : null };
export interface Contribution {
  'amount' : bigint,
  'timestampNs' : bigint,
  'contributor' : Principal,
}
export interface Header { 'value' : string, 'name' : string }
export type PlatformRole = { 'platformAdmin' : null };
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
export interface ShoppingItem {
  'productName' : string,
  'currency' : string,
  'quantity' : bigint,
  'priceInCents' : bigint,
  'productDescription' : string,
}
export interface StripeConfiguration {
  'allowedCountries' : Array<string>,
  'secretKey' : string,
}
export type StripeSessionStatus = {
    'completed' : { 'userPrincipal' : [] | [string], 'response' : string }
  } |
  { 'failed' : { 'error' : string } };
export interface TransformationInput {
  'context' : Uint8Array | number[],
  'response' : TransformationOutput,
}
export interface TransformationOutput {
  'status' : bigint,
  'body' : Uint8Array | number[],
  'headers' : Array<Header>,
}
export interface UserProfile { 'name' : string }
export interface _SERVICE {
  'addCampaignUpdate' : ActorMethod<[bigint, string], undefined>,
  'bootstrapPlatformAdmin' : ActorMethod<[], undefined>,
  'canFinalizeCampaign' : ActorMethod<[bigint], boolean>,
  'contributeToCampaign' : ActorMethod<[bigint, bigint], undefined>,
  'createCampaign' : ActorMethod<
    [bigint, string, string, bigint, bigint],
    undefined
  >,
  'createCheckoutSession' : ActorMethod<
    [Array<ShoppingItem>, string, string],
    string
  >,
  'createCommunity' : ActorMethod<[string, string], undefined>,
  'createProposal' : ActorMethod<
    [bigint, string, string, [] | [ProposalOverrides]],
    undefined
  >,
  'finalizeCampaign' : ActorMethod<[bigint], undefined>,
  'finalizeProposal' : ActorMethod<[bigint], undefined>,
  'getCallerCommunityRole' : ActorMethod<[bigint], [] | [CommunityRole]>,
  'getCallerPlatformRole' : ActorMethod<[], [] | [PlatformRole]>,
  'getCallerUserProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getCampaignById' : ActorMethod<[bigint], [] | [Campaign]>,
  'getCampaignContributions' : ActorMethod<[bigint], Array<Contribution>>,
  'getCampaignUpdates' : ActorMethod<[bigint], Array<CampaignUpdate>>,
  'getCommunityAccess' : ActorMethod<[bigint], CommunityAccess>,
  'getCommunityById' : ActorMethod<[bigint], [] | [Community]>,
  'getProposalById' : ActorMethod<[bigint], [] | [Proposal]>,
  'getStripeSessionStatus' : ActorMethod<[string], StripeSessionStatus>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'isCallerPlatformAdmin' : ActorMethod<[], boolean>,
  'isStripeConfigured' : ActorMethod<[], boolean>,
  'leaveCommunity' : ActorMethod<[bigint], undefined>,
  'listAllUsers' : ActorMethod<[], Array<[Principal, UserProfile]>>,
  'listCampaignsByCommunity' : ActorMethod<[bigint], Array<Campaign>>,
  'listCommunities' : ActorMethod<[], Array<Community>>,
  'listCommunityMembers' : ActorMethod<[bigint], Array<CommunityMember>>,
  'listPlatformAdmins' : ActorMethod<[], Array<Principal>>,
  'listProposalsByCommunity' : ActorMethod<[bigint], Array<Proposal>>,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'setCommunityRole' : ActorMethod<
    [bigint, Principal, [] | [CommunityRole]],
    undefined
  >,
  'setPlatformAdmin' : ActorMethod<[Principal, boolean], undefined>,
  'setStripeConfiguration' : ActorMethod<[StripeConfiguration], undefined>,
  'transform' : ActorMethod<[TransformationInput], TransformationOutput>,
  'voteOnProposal' : ActorMethod<[bigint, boolean], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
