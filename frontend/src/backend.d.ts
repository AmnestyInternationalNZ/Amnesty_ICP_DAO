import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface Community {
    id: bigint;
    members: Array<Principal>;
    admin: Principal;
    name: string;
    policy: string;
}
export interface Proposal {
    id: bigint;
    no: bigint;
    yes: bigint;
    title: string;
    creator: Principal;
    communityId: bigint;
    startNs: bigint;
    description: string;
    endNs: bigint;
    passPct: bigint;
    state: ProposalState;
    quorum: bigint;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface CampaignUpdate {
    id: bigint;
    creator: Principal;
    content: string;
    campaignId: bigint;
    timestampNs: bigint;
}
export interface ProposalOverrides {
    passPct?: bigint;
    windowNs?: bigint;
    quorum?: bigint;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface Campaign {
    id: bigint;
    title: string;
    creator: Principal;
    goalAmount: bigint;
    communityId: bigint;
    deadlineNs: bigint;
    createdNs: bigint;
    description: string;
    totalRaised: bigint;
    state: CampaignState;
}
export interface Contribution {
    amount: bigint;
    timestampNs: bigint;
    contributor: Principal;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface UserProfile {
    name: string;
}
export enum CampaignState {
    active = "active",
    expired = "expired",
    successful = "successful",
    failed = "failed"
}
export enum ProposalState {
    active = "active",
    pendingFinalization = "pendingFinalization",
    failed = "failed",
    passed = "passed"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCampaignUpdate(campaignId: bigint, content: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    canFinalizeCampaign(campaignId: bigint): Promise<boolean>;
    contributeToCampaign(campaignId: bigint, amount: bigint): Promise<void>;
    createCampaign(communityId: bigint, title: string, description: string, goalAmount: bigint, deadlineNs: bigint): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createCommunity(name: string, policy: string): Promise<void>;
    createProposal(communityId: bigint, title: string, description: string, overrides: ProposalOverrides | null): Promise<void>;
    enterCommunityPortal(communityId: bigint): Promise<Community>;
    finalizeCampaign(campaignId: bigint): Promise<void>;
    finalizeProposal(proposalId: bigint): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCampaignById(campaignId: bigint): Promise<Campaign | null>;
    getCampaignContributions(campaignId: bigint): Promise<Array<Contribution>>;
    getCampaignUpdates(campaignId: bigint): Promise<Array<CampaignUpdate>>;
    getCommunityById(id: bigint): Promise<Community | null>;
    getProposalById(proposalId: bigint): Promise<Proposal | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    joinCommunity(communityId: bigint): Promise<void>;
    leaveCommunity(communityId: bigint): Promise<void>;
    listAllUsers(): Promise<Array<[Principal, UserProfile]>>;
    listCampaignsByCommunity(communityId: bigint): Promise<Array<Campaign>>;
    listCommunities(): Promise<Array<Community>>;
    listProposalsByCommunity(communityId: bigint): Promise<Array<Proposal>>;
    removeMemberFromCommunity(communityId: bigint, memberToRemove: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    voteOnProposal(proposalId: bigint, voteYes: boolean): Promise<void>;
}