import { Actor, type ActorSubclass, type Agent } from '@icp-sdk/core/agent';
import type { Principal } from '@dfinity/principal';
import { idlFactory } from './declarations/backend.did';
import type {
    _SERVICE,
    Campaign as CandidCampaign,
    CampaignState as CandidCampaignState,
    CampaignUpdate,
    Community,
    CommunityAccess as CandidCommunityAccess,
    CommunityMember as CandidCommunityMember,
    CommunityRole as CandidCommunityRole,
    Contribution,
    PlatformRole as CandidPlatformRole,
    Proposal as CandidProposal,
    ProposalOverrides as CandidProposalOverrides,
    ProposalState as CandidProposalState,
    ShoppingItem,
    StripeConfiguration,
    StripeSessionStatus,
    TransformationInput,
    TransformationOutput,
    UserProfile
} from './declarations/backend.did';

export enum PlatformRole {
    platformAdmin = 'platformAdmin'
}

export enum CommunityRole {
    communityAdmin = 'communityAdmin',
    member = 'member'
}

export enum CampaignState {
    active = 'active',
    expired = 'expired',
    successful = 'successful',
    failed = 'failed'
}

export enum ProposalState {
    active = 'active',
    pendingFinalization = 'pendingFinalization',
    failed = 'failed',
    passed = 'passed'
}

export interface ProposalOverrides {
    passPct?: bigint;
    windowNs?: bigint;
    quorum?: bigint;
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

export interface CommunityMember {
    principal: Principal;
    role: CommunityRole;
    profile: UserProfile | null;
}

export interface CommunityAccess {
    canCreateCampaign: boolean;
    canContributeToCampaign: boolean;
    communityRole: CommunityRole | null;
    canLeaveCommunity: boolean;
    canManageMembership: boolean;
    isPlatformAdmin: boolean;
    canCreateProposal: boolean;
    canVoteOnProposal: boolean;
}

export interface CreateActorOptions {
    agent?: Agent;
    agentOptions?: Record<string, unknown>;
    processError?: (error: unknown) => never;
}

function fromOptional<T, R>(value: [] | [T], map: (input: T) => R): R | null {
    return value.length === 0 ? null : map(value[0]);
}

function toOptional<T>(value: T | null | undefined): [] | [T] {
    return value == null ? [] : [value];
}

function fromPlatformRole(value: CandidPlatformRole): PlatformRole {
    if ('platformAdmin' in value) {
        return PlatformRole.platformAdmin;
    }
    throw new Error('Unknown platform role');
}

function toPlatformRole(value: PlatformRole): CandidPlatformRole {
    return value === PlatformRole.platformAdmin ? { platformAdmin: null } : value;
}

function fromCommunityRole(value: CandidCommunityRole): CommunityRole {
    if ('communityAdmin' in value) {
        return CommunityRole.communityAdmin;
    }
    if ('member' in value) {
        return CommunityRole.member;
    }
    throw new Error('Unknown community role');
}

function toCommunityRole(value: CommunityRole): CandidCommunityRole {
    switch (value) {
        case CommunityRole.communityAdmin:
            return { communityAdmin: null };
        case CommunityRole.member:
            return { member: null };
    }
}

function fromCampaignState(value: CandidCampaignState): CampaignState {
    if ('active' in value) return CampaignState.active;
    if ('expired' in value) return CampaignState.expired;
    if ('successful' in value) return CampaignState.successful;
    if ('failed' in value) return CampaignState.failed;
    throw new Error('Unknown campaign state');
}

function fromProposalState(value: CandidProposalState): ProposalState {
    if ('active' in value) return ProposalState.active;
    if ('pendingFinalization' in value) return ProposalState.pendingFinalization;
    if ('failed' in value) return ProposalState.failed;
    if ('passed' in value) return ProposalState.passed;
    throw new Error('Unknown proposal state');
}

function fromCampaign(value: CandidCampaign): Campaign {
    return {
        ...value,
        state: fromCampaignState(value.state)
    };
}

function fromProposal(value: CandidProposal): Proposal {
    return {
        ...value,
        state: fromProposalState(value.state)
    };
}

function fromCommunityMember(value: CandidCommunityMember): CommunityMember {
    return {
        principal: value.principal,
        role: fromCommunityRole(value.role),
        profile: value.profile.length === 0 ? null : value.profile[0]
    };
}

function fromCommunityAccess(value: CandidCommunityAccess): CommunityAccess {
    return {
        canCreateCampaign: value.canCreateCampaign,
        canContributeToCampaign: value.canContributeToCampaign,
        communityRole: value.communityRole.length === 0 ? null : fromCommunityRole(value.communityRole[0]),
        canLeaveCommunity: value.canLeaveCommunity,
        canManageMembership: value.canManageMembership,
        isPlatformAdmin: value.isPlatformAdmin,
        canCreateProposal: value.canCreateProposal,
        canVoteOnProposal: value.canVoteOnProposal
    };
}

function toProposalOverrides(value: ProposalOverrides): CandidProposalOverrides {
    return {
        passPct: toOptional(value.passPct),
        windowNs: toOptional(value.windowNs),
        quorum: toOptional(value.quorum)
    };
}

export interface backendInterface {
    addCampaignUpdate(campaignId: bigint, content: string): Promise<void>;
    bootstrapPlatformAdmin(): Promise<void>;
    canFinalizeCampaign(campaignId: bigint): Promise<boolean>;
    contributeToCampaign(campaignId: bigint, amount: bigint): Promise<void>;
    createCampaign(communityId: bigint, title: string, description: string, goalAmount: bigint, deadlineNs: bigint): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createCommunity(name: string, policy: string): Promise<void>;
    createProposal(communityId: bigint, title: string, description: string, overrides: ProposalOverrides | null): Promise<void>;
    finalizeCampaign(campaignId: bigint): Promise<void>;
    finalizeProposal(proposalId: bigint): Promise<void>;
    getCallerCommunityRole(communityId: bigint): Promise<CommunityRole | null>;
    getCallerPlatformRole(): Promise<PlatformRole | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCampaignById(campaignId: bigint): Promise<Campaign | null>;
    getCampaignContributions(campaignId: bigint): Promise<Array<Contribution>>;
    getCampaignUpdates(campaignId: bigint): Promise<Array<CampaignUpdate>>;
    getCommunityAccess(communityId: bigint): Promise<CommunityAccess>;
    getCommunityById(id: bigint): Promise<Community | null>;
    getProposalById(proposalId: bigint): Promise<Proposal | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerPlatformAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    leaveCommunity(communityId: bigint): Promise<void>;
    listAllUsers(): Promise<Array<[Principal, UserProfile]>>;
    listCampaignsByCommunity(communityId: bigint): Promise<Array<Campaign>>;
    listCommunities(): Promise<Array<Community>>;
    listCommunityMembers(communityId: bigint): Promise<Array<CommunityMember>>;
    listPlatformAdmins(): Promise<Array<Principal>>;
    listProposalsByCommunity(communityId: bigint): Promise<Array<Proposal>>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setCommunityRole(communityId: bigint, user: Principal, role: CommunityRole | null): Promise<void>;
    setPlatformAdmin(user: Principal, enabled: boolean): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    voteOnProposal(proposalId: bigint, voteYes: boolean): Promise<void>;
}

class Backend implements backendInterface {
    constructor(
        private actor: ActorSubclass<_SERVICE>,
        private processError?: (error: unknown) => never
    ) {}

    private async handle<T>(runner: () => Promise<T>): Promise<T> {
        if (!this.processError) {
            return runner();
        }

        try {
            return await runner();
        } catch (error) {
            this.processError(error);
            throw new Error('unreachable');
        }
    }

    async addCampaignUpdate(campaignId: bigint, content: string): Promise<void> {
        return this.handle(() => this.actor.addCampaignUpdate(campaignId, content));
    }

    async bootstrapPlatformAdmin(): Promise<void> {
        return this.handle(() => this.actor.bootstrapPlatformAdmin());
    }

    async canFinalizeCampaign(campaignId: bigint): Promise<boolean> {
        return this.handle(() => this.actor.canFinalizeCampaign(campaignId));
    }

    async contributeToCampaign(campaignId: bigint, amount: bigint): Promise<void> {
        return this.handle(() => this.actor.contributeToCampaign(campaignId, amount));
    }

    async createCampaign(communityId: bigint, title: string, description: string, goalAmount: bigint, deadlineNs: bigint): Promise<void> {
        return this.handle(() => this.actor.createCampaign(communityId, title, description, goalAmount, deadlineNs));
    }

    async createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string> {
        return this.handle(() => this.actor.createCheckoutSession(items, successUrl, cancelUrl));
    }

    async createCommunity(name: string, policy: string): Promise<void> {
        return this.handle(() => this.actor.createCommunity(name, policy));
    }

    async createProposal(communityId: bigint, title: string, description: string, overrides: ProposalOverrides | null): Promise<void> {
        return this.handle(() =>
            this.actor.createProposal(communityId, title, description, toOptional(overrides == null ? undefined : toProposalOverrides(overrides)))
        );
    }

    async finalizeCampaign(campaignId: bigint): Promise<void> {
        return this.handle(() => this.actor.finalizeCampaign(campaignId));
    }

    async finalizeProposal(proposalId: bigint): Promise<void> {
        return this.handle(() => this.actor.finalizeProposal(proposalId));
    }

    async getCallerCommunityRole(communityId: bigint): Promise<CommunityRole | null> {
        return this.handle(async () => fromOptional(await this.actor.getCallerCommunityRole(communityId), fromCommunityRole));
    }

    async getCallerPlatformRole(): Promise<PlatformRole | null> {
        return this.handle(async () => fromOptional(await this.actor.getCallerPlatformRole(), fromPlatformRole));
    }

    async getCallerUserProfile(): Promise<UserProfile | null> {
        return this.handle(async () => fromOptional(await this.actor.getCallerUserProfile(), (value) => value));
    }

    async getCampaignById(campaignId: bigint): Promise<Campaign | null> {
        return this.handle(async () => fromOptional(await this.actor.getCampaignById(campaignId), fromCampaign));
    }

    async getCampaignContributions(campaignId: bigint): Promise<Array<Contribution>> {
        return this.handle(() => this.actor.getCampaignContributions(campaignId));
    }

    async getCampaignUpdates(campaignId: bigint): Promise<Array<CampaignUpdate>> {
        return this.handle(() => this.actor.getCampaignUpdates(campaignId));
    }

    async getCommunityAccess(communityId: bigint): Promise<CommunityAccess> {
        return this.handle(async () => fromCommunityAccess(await this.actor.getCommunityAccess(communityId)));
    }

    async getCommunityById(id: bigint): Promise<Community | null> {
        return this.handle(async () => fromOptional(await this.actor.getCommunityById(id), (value) => value));
    }

    async getProposalById(proposalId: bigint): Promise<Proposal | null> {
        return this.handle(async () => fromOptional(await this.actor.getProposalById(proposalId), fromProposal));
    }

    async getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus> {
        return this.handle(() => this.actor.getStripeSessionStatus(sessionId));
    }

    async getUserProfile(user: Principal): Promise<UserProfile | null> {
        return this.handle(async () => fromOptional(await this.actor.getUserProfile(user), (value) => value));
    }

    async isCallerPlatformAdmin(): Promise<boolean> {
        return this.handle(() => this.actor.isCallerPlatformAdmin());
    }

    async isStripeConfigured(): Promise<boolean> {
        return this.handle(() => this.actor.isStripeConfigured());
    }

    async leaveCommunity(communityId: bigint): Promise<void> {
        return this.handle(() => this.actor.leaveCommunity(communityId));
    }

    async listAllUsers(): Promise<Array<[Principal, UserProfile]>> {
        return this.handle(() => this.actor.listAllUsers());
    }

    async listCampaignsByCommunity(communityId: bigint): Promise<Array<Campaign>> {
        return this.handle(async () => (await this.actor.listCampaignsByCommunity(communityId)).map(fromCampaign));
    }

    async listCommunities(): Promise<Array<Community>> {
        return this.handle(() => this.actor.listCommunities());
    }

    async listCommunityMembers(communityId: bigint): Promise<Array<CommunityMember>> {
        return this.handle(async () => (await this.actor.listCommunityMembers(communityId)).map(fromCommunityMember));
    }

    async listPlatformAdmins(): Promise<Array<Principal>> {
        return this.handle(() => this.actor.listPlatformAdmins());
    }

    async listProposalsByCommunity(communityId: bigint): Promise<Array<Proposal>> {
        return this.handle(async () => (await this.actor.listProposalsByCommunity(communityId)).map(fromProposal));
    }

    async saveCallerUserProfile(profile: UserProfile): Promise<void> {
        return this.handle(() => this.actor.saveCallerUserProfile(profile));
    }

    async setCommunityRole(communityId: bigint, user: Principal, role: CommunityRole | null): Promise<void> {
        return this.handle(() => this.actor.setCommunityRole(communityId, user, toOptional(role == null ? undefined : toCommunityRole(role))));
    }

    async setPlatformAdmin(user: Principal, enabled: boolean): Promise<void> {
        return this.handle(() => this.actor.setPlatformAdmin(user, enabled));
    }

    async setStripeConfiguration(config: StripeConfiguration): Promise<void> {
        return this.handle(() => this.actor.setStripeConfiguration(config));
    }

    async transform(input: TransformationInput): Promise<TransformationOutput> {
        return this.handle(() => this.actor.transform(input));
    }

    async voteOnProposal(proposalId: bigint, voteYes: boolean): Promise<void> {
        return this.handle(() => this.actor.voteOnProposal(proposalId, voteYes));
    }
}

export function createActor(canisterId: string, options: CreateActorOptions = {}): backendInterface {
    const actor = Actor.createActor<_SERVICE>(idlFactory, {
        agent: options.agent,
        canisterId
    });

    return new Backend(actor, options.processError);
}
