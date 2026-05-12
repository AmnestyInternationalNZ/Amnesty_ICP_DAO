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
export interface CampaignContributionPayload {
  'contributorName' : string,
  'amount' : bigint,
  'timestampNs' : bigint,
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
export interface CampaignUpdatePayload {
  'id' : bigint,
  'content' : string,
  'campaignId' : bigint,
  'creatorName' : string,
  'timestampNs' : bigint,
}
export type CampaignVisibility = { 'publicCampaign' : null } |
  { 'community' : null };
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
export interface CommunityBoardPayload {
  'id' : bigint,
  'access' : Array<WorkspaceAccessEntry>,
  'title' : string,
  'communityId' : bigint,
  'owner' : Principal,
  'cards' : Array<KanbanCard>,
  'createdAt' : bigint,
  'role' : WorkspaceRole,
  'publicToken' : [] | [string],
  'updatedAt' : bigint,
  'communityShare' : [] | [WorkspaceRole],
  'archived' : boolean,
  'columns' : Array<KanbanColumn>,
}
export interface CommunityBoardSummary {
  'id' : bigint,
  'title' : string,
  'communityId' : bigint,
  'owner' : Principal,
  'createdAt' : bigint,
  'role' : WorkspaceRole,
  'updatedAt' : bigint,
  'cardCount' : bigint,
  'communityShare' : [] | [WorkspaceRole],
  'columnCount' : bigint,
  'archived' : boolean,
}
export interface CommunityDocumentPayload {
  'id' : bigint,
  'access' : Array<WorkspaceAccessEntry>,
  'title' : string,
  'communityId' : bigint,
  'snapshot' : [] | [Uint8Array | number[]],
  'owner' : Principal,
  'createdAt' : bigint,
  'role' : WorkspaceRole,
  'version' : bigint,
  'updatedAt' : bigint,
  'updates' : Array<Uint8Array | number[]>,
  'communityShare' : [] | [WorkspaceRole],
  'parentId' : [] | [bigint],
  'archived' : boolean,
}
export interface CommunityDocumentSummary {
  'id' : bigint,
  'title' : string,
  'communityId' : bigint,
  'owner' : Principal,
  'createdAt' : bigint,
  'role' : WorkspaceRole,
  'version' : bigint,
  'updatedAt' : bigint,
  'communityShare' : [] | [WorkspaceRole],
  'parentId' : [] | [bigint],
  'archived' : boolean,
}
export interface CommunityEventInput {
  'title' : string,
  'allDay' : boolean,
  'startUtc' : bigint,
  'description' : [] | [string],
  'location' : [] | [string],
  'endUtc' : bigint,
}
export interface CommunityEventPayload {
  'id' : bigint,
  'access' : Array<WorkspaceAccessEntry>,
  'title' : string,
  'communityId' : bigint,
  'owner' : Principal,
  'allDay' : boolean,
  'startUtc' : bigint,
  'createdAt' : bigint,
  'role' : WorkspaceRole,
  'description' : [] | [string],
  'publicToken' : [] | [string],
  'updatedAt' : bigint,
  'communityShare' : [] | [WorkspaceRole],
  'location' : [] | [string],
  'archived' : boolean,
  'endUtc' : bigint,
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
export interface FundraisingCampaignInput {
  'impact' : string,
  'title' : string,
  'creatorContact' : [] | [string],
  'goalAmount' : bigint,
  'deadlineNs' : bigint,
  'creatorName' : string,
  'mediaUrl' : [] | [string],
  'story' : string,
  'shortDescription' : string,
  'fundsUse' : string,
  'visibility' : CampaignVisibility,
}
export interface FundraisingCampaignPayload {
  'id' : bigint,
  'impact' : string,
  'canManagePublicLink' : boolean,
  'title' : string,
  'creator' : [] | [Principal],
  'creatorContact' : [] | [string],
  'goalAmount' : bigint,
  'communityId' : bigint,
  'contributions' : Array<CampaignContributionPayload>,
  'deadlineNs' : bigint,
  'createdNs' : bigint,
  'canEdit' : boolean,
  'creatorName' : string,
  'publicToken' : [] | [string],
  'mediaUrl' : [] | [string],
  'totalRaised' : bigint,
  'updatedNs' : bigint,
  'state' : CampaignState,
  'story' : string,
  'shortDescription' : string,
  'updates' : Array<CampaignUpdatePayload>,
  'fundsUse' : string,
  'canContribute' : boolean,
  'visibility' : CampaignVisibility,
  'archived' : boolean,
}
export interface Header { 'value' : string, 'name' : string }
export interface KanbanCard {
  'id' : bigint,
  'eventId' : [] | [bigint],
  'title' : string,
  'assignedTo' : Array<Principal>,
  'createdAt' : bigint,
  'createdBy' : Principal,
  'description' : [] | [string],
  'updatedAt' : bigint,
  'docId' : [] | [bigint],
  'dueDateUtc' : [] | [bigint],
}
export interface KanbanCardInput {
  'eventId' : [] | [bigint],
  'title' : string,
  'assignedTo' : Array<Principal>,
  'description' : [] | [string],
  'docId' : [] | [bigint],
  'dueDateUtc' : [] | [bigint],
}
export interface KanbanColumn {
  'id' : bigint,
  'title' : string,
  'cardIds' : Array<bigint>,
}
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
export interface WorkspaceAccessEntry {
  'role' : WorkspaceRole,
  'user' : Principal,
}
export type WorkspaceRole = { 'owner' : null } |
  { 'editor' : null } |
  { 'viewer' : null };
export interface _SERVICE {
  'addCampaignUpdate' : ActorMethod<[bigint, string], undefined>,
  'addCommunityBoardCard' : ActorMethod<
    [bigint, bigint, bigint, KanbanCardInput],
    KanbanCard
  >,
  'addCommunityBoardColumn' : ActorMethod<
    [bigint, bigint, string],
    KanbanColumn
  >,
  'appendCommunityDocumentUpdate' : ActorMethod<
    [bigint, bigint, Uint8Array | number[]],
    bigint
  >,
  'archiveCampaign' : ActorMethod<[bigint, bigint], undefined>,
  'archiveCommunityBoard' : ActorMethod<[bigint, bigint], undefined>,
  'archiveCommunityDocument' : ActorMethod<[bigint, bigint], undefined>,
  'archiveCommunityEvent' : ActorMethod<[bigint, bigint], undefined>,
  'bootstrapPlatformAdmin' : ActorMethod<[], undefined>,
  'canFinalizeCampaign' : ActorMethod<[bigint], boolean>,
  'contributeToCampaign' : ActorMethod<[bigint, bigint], undefined>,
  'contributeToPublicCampaign' : ActorMethod<[string, bigint], undefined>,
  'createCampaign' : ActorMethod<
    [bigint, string, string, bigint, bigint],
    undefined
  >,
  'createCheckoutSession' : ActorMethod<
    [Array<ShoppingItem>, string, string],
    string
  >,
  'createCommunity' : ActorMethod<[string, string], undefined>,
  'createCommunityBoard' : ActorMethod<[bigint, string], bigint>,
  'createCommunityDocument' : ActorMethod<[bigint, string], bigint>,
  'createCommunityEvent' : ActorMethod<[bigint, CommunityEventInput], bigint>,
  'createFundraisingCampaign' : ActorMethod<
    [bigint, FundraisingCampaignInput],
    bigint
  >,
  'createProposal' : ActorMethod<
    [bigint, string, string, [] | [ProposalOverrides]],
    undefined
  >,
  'deleteCommunityBoardCard' : ActorMethod<[bigint, bigint, bigint], undefined>,
  'deleteCommunityBoardColumn' : ActorMethod<
    [bigint, bigint, bigint],
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
  'getCommunityBoard' : ActorMethod<
    [bigint, bigint],
    [] | [CommunityBoardPayload]
  >,
  'getCommunityById' : ActorMethod<[bigint], [] | [Community]>,
  'getCommunityDocument' : ActorMethod<
    [bigint, bigint],
    [] | [CommunityDocumentPayload]
  >,
  'getCommunityEvent' : ActorMethod<
    [bigint, bigint],
    [] | [CommunityEventPayload]
  >,
  'getFundraisingCampaign' : ActorMethod<
    [bigint, bigint],
    [] | [FundraisingCampaignPayload]
  >,
  'getProposalById' : ActorMethod<[bigint], [] | [Proposal]>,
  'getPublicCampaign' : ActorMethod<
    [string],
    [] | [FundraisingCampaignPayload]
  >,
  'getPublicCommunityBoard' : ActorMethod<
    [string],
    [] | [CommunityBoardPayload]
  >,
  'getPublicCommunityEvent' : ActorMethod<
    [string],
    [] | [CommunityEventPayload]
  >,
  'getStripeSessionStatus' : ActorMethod<[string], StripeSessionStatus>,
  'getUserProfile' : ActorMethod<[Principal], [] | [UserProfile]>,
  'isCallerPlatformAdmin' : ActorMethod<[], boolean>,
  'isStripeConfigured' : ActorMethod<[], boolean>,
  'leaveCommunity' : ActorMethod<[bigint], undefined>,
  'listAllUsers' : ActorMethod<[], Array<[Principal, UserProfile]>>,
  'listCampaignsByCommunity' : ActorMethod<[bigint], Array<Campaign>>,
  'listCommunities' : ActorMethod<[], Array<Community>>,
  'listCommunityBoards' : ActorMethod<[bigint], Array<CommunityBoardSummary>>,
  'listCommunityDocuments' : ActorMethod<
    [bigint],
    Array<CommunityDocumentSummary>
  >,
  'listCommunityEvents' : ActorMethod<[bigint], Array<CommunityEventPayload>>,
  'listCommunityMembers' : ActorMethod<[bigint], Array<CommunityMember>>,
  'listFundraisingCampaigns' : ActorMethod<
    [bigint],
    Array<FundraisingCampaignPayload>
  >,
  'listPlatformAdmins' : ActorMethod<[], Array<Principal>>,
  'listProposalsByCommunity' : ActorMethod<[bigint], Array<Proposal>>,
  'moveCommunityBoardCard' : ActorMethod<
    [bigint, bigint, bigint, bigint, bigint],
    undefined
  >,
  'renameCommunityBoard' : ActorMethod<[bigint, bigint, string], undefined>,
  'renameCommunityBoardColumn' : ActorMethod<
    [bigint, bigint, bigint, string],
    undefined
  >,
  'renameCommunityDocument' : ActorMethod<[bigint, bigint, string], undefined>,
  'reorderCommunityBoardColumns' : ActorMethod<
    [bigint, bigint, Array<bigint>],
    undefined
  >,
  'saveCallerUserProfile' : ActorMethod<[UserProfile], undefined>,
  'saveCommunityDocumentSnapshot' : ActorMethod<
    [bigint, bigint, Uint8Array | number[], bigint],
    undefined
  >,
  'setCampaignPublicLink' : ActorMethod<
    [bigint, bigint, [] | [string]],
    [] | [string]
  >,
  'setCommunityBoardGrant' : ActorMethod<
    [bigint, bigint, Principal, [] | [WorkspaceRole]],
    undefined
  >,
  'setCommunityBoardPublicLink' : ActorMethod<
    [bigint, bigint, [] | [string]],
    [] | [string]
  >,
  'setCommunityBoardShare' : ActorMethod<
    [bigint, bigint, [] | [WorkspaceRole]],
    [] | [WorkspaceRole]
  >,
  'setCommunityDocumentGrant' : ActorMethod<
    [bigint, bigint, Principal, [] | [WorkspaceRole]],
    undefined
  >,
  'setCommunityDocumentParent' : ActorMethod<
    [bigint, bigint, [] | [bigint]],
    [] | [bigint]
  >,
  'setCommunityDocumentShare' : ActorMethod<
    [bigint, bigint, [] | [WorkspaceRole]],
    [] | [WorkspaceRole]
  >,
  'setCommunityEventGrant' : ActorMethod<
    [bigint, bigint, Principal, [] | [WorkspaceRole]],
    undefined
  >,
  'setCommunityEventPublicLink' : ActorMethod<
    [bigint, bigint, [] | [string]],
    [] | [string]
  >,
  'setCommunityEventShare' : ActorMethod<
    [bigint, bigint, [] | [WorkspaceRole]],
    [] | [WorkspaceRole]
  >,
  'setCommunityRole' : ActorMethod<
    [bigint, Principal, [] | [CommunityRole]],
    undefined
  >,
  'setPlatformAdmin' : ActorMethod<[Principal, boolean], undefined>,
  'setStripeConfiguration' : ActorMethod<[StripeConfiguration], undefined>,
  'transform' : ActorMethod<[TransformationInput], TransformationOutput>,
  'updateCommunityBoardCard' : ActorMethod<
    [bigint, bigint, bigint, KanbanCardInput],
    undefined
  >,
  'updateCommunityEvent' : ActorMethod<
    [bigint, bigint, CommunityEventInput],
    undefined
  >,
  'updateFundraisingCampaign' : ActorMethod<
    [bigint, bigint, FundraisingCampaignInput],
    undefined
  >,
  'voteOnProposal' : ActorMethod<[bigint, boolean], undefined>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
