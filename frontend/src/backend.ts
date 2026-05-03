import { Actor, type ActorSubclass, type Agent } from '@icp-sdk/core/agent';
import type { Principal } from '@dfinity/principal';
import { idlFactory } from './declarations/backend.did';
import type {
    _SERVICE,
    Campaign as CandidCampaign,
    CampaignState as CandidCampaignState,
    CampaignUpdate as CandidCampaignUpdate,
    CommunityBoardPayload as CandidCommunityBoardPayload,
    CommunityBoardSummary as CandidCommunityBoardSummary,
    Community as CandidCommunity,
    CommunityAccess as CandidCommunityAccess,
    CommunityDocumentPayload as CandidCommunityDocumentPayload,
    CommunityDocumentSummary as CandidCommunityDocumentSummary,
    CommunityEventInput as CandidCommunityEventInput,
    CommunityEventPayload as CandidCommunityEventPayload,
    CommunityMember as CandidCommunityMember,
    CommunityRole as CandidCommunityRole,
    Contribution as CandidContribution,
    KanbanCard as CandidKanbanCard,
    KanbanCardInput as CandidKanbanCardInput,
    KanbanColumn as CandidKanbanColumn,
    PlatformRole as CandidPlatformRole,
    Proposal as CandidProposal,
    ProposalOverrides as CandidProposalOverrides,
    ProposalState as CandidProposalState,
    ShoppingItem as CandidShoppingItem,
    StripeConfiguration as CandidStripeConfiguration,
    StripeSessionStatus as CandidStripeSessionStatus,
    TransformationInput as CandidTransformationInput,
    TransformationOutput as CandidTransformationOutput,
    UserProfile as CandidUserProfile,
    WorkspaceAccessEntry as CandidWorkspaceAccessEntry,
    WorkspaceRole as CandidWorkspaceRole
} from './declarations/backend.did';

export type Community = CandidCommunity;
export type CampaignUpdate = CandidCampaignUpdate;
export type Contribution = CandidContribution;
export type ShoppingItem = CandidShoppingItem;
export type StripeConfiguration = CandidStripeConfiguration;
export type StripeSessionStatus = CandidStripeSessionStatus;
export type TransformationInput = CandidTransformationInput;
export type TransformationOutput = CandidTransformationOutput;
export type UserProfile = CandidUserProfile;

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

export enum WorkspaceRole {
    owner = 'owner',
    editor = 'editor',
    viewer = 'viewer'
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

export interface WorkspaceAccessEntry {
    user: Principal;
    role: WorkspaceRole;
}

export interface CommunityDocumentSummary {
    id: bigint;
    communityId: bigint;
    title: string;
    owner: Principal;
    createdAt: bigint;
    updatedAt: bigint;
    archived: boolean;
    role: WorkspaceRole;
    communityShare: WorkspaceRole | null;
    parentId: bigint | null;
    version: bigint;
}

export interface CommunityDocumentPayload extends CommunityDocumentSummary {
    access: WorkspaceAccessEntry[];
    snapshot: Uint8Array | null;
    updates: Uint8Array[];
}

export type KanbanColumn = CandidKanbanColumn;

export interface KanbanCardInput {
    title: string;
    description?: string | null;
    assignedTo?: Principal[];
    docId?: bigint | null;
    eventId?: bigint | null;
    dueDateUtc?: bigint | null;
}

export interface KanbanCard {
    id: bigint;
    title: string;
    description: string | null;
    createdBy: Principal;
    assignedTo: Principal[];
    docId: bigint | null;
    eventId: bigint | null;
    dueDateUtc: bigint | null;
    createdAt: bigint;
    updatedAt: bigint;
}

export interface CommunityBoardSummary {
    id: bigint;
    communityId: bigint;
    title: string;
    owner: Principal;
    createdAt: bigint;
    updatedAt: bigint;
    archived: boolean;
    role: WorkspaceRole;
    communityShare: WorkspaceRole | null;
    columnCount: bigint;
    cardCount: bigint;
}

export interface CommunityBoardPayload extends CommunityBoardSummary {
    access: WorkspaceAccessEntry[];
    publicToken: string | null;
    columns: KanbanColumn[];
    cards: KanbanCard[];
}

export interface CommunityEventInput {
    title: string;
    description?: string | null;
    location?: string | null;
    startUtc: bigint;
    endUtc: bigint;
    allDay: boolean;
}

export interface CommunityEventPayload extends CommunityEventInput {
    id: bigint;
    communityId: bigint;
    owner: Principal;
    createdAt: bigint;
    updatedAt: bigint;
    archived: boolean;
    role: WorkspaceRole;
    access: WorkspaceAccessEntry[];
    communityShare: WorkspaceRole | null;
    description: string | null;
    location: string | null;
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

function fromWorkspaceRole(value: CandidWorkspaceRole): WorkspaceRole {
    if ('owner' in value) return WorkspaceRole.owner;
    if ('editor' in value) return WorkspaceRole.editor;
    if ('viewer' in value) return WorkspaceRole.viewer;
    throw new Error('Unknown workspace role');
}

function toWorkspaceRole(value: WorkspaceRole): CandidWorkspaceRole {
    switch (value) {
        case WorkspaceRole.owner:
            return { owner: null };
        case WorkspaceRole.editor:
            return { editor: null };
        case WorkspaceRole.viewer:
            return { viewer: null };
    }
}

function toBlob(value: Uint8Array | number[]): Uint8Array {
    return value instanceof Uint8Array ? value : Uint8Array.from(value);
}

function fromWorkspaceAccessEntry(value: CandidWorkspaceAccessEntry): WorkspaceAccessEntry {
    return {
        user: value.user,
        role: fromWorkspaceRole(value.role)
    };
}

function toProposalOverrides(value: ProposalOverrides): CandidProposalOverrides {
    return {
        passPct: toOptional(value.passPct),
        windowNs: toOptional(value.windowNs),
        quorum: toOptional(value.quorum)
    };
}

function fromCommunityDocumentSummary(value: CandidCommunityDocumentSummary): CommunityDocumentSummary {
    return {
        id: value.id,
        communityId: value.communityId,
        title: value.title,
        owner: value.owner,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        archived: value.archived,
        role: fromWorkspaceRole(value.role),
        communityShare: fromOptional(value.communityShare, fromWorkspaceRole),
        parentId: fromOptional(value.parentId, (id) => id),
        version: value.version
    };
}

function fromCommunityDocumentPayload(value: CandidCommunityDocumentPayload): CommunityDocumentPayload {
    return {
        ...fromCommunityDocumentSummary(value),
        access: value.access.map(fromWorkspaceAccessEntry),
        snapshot: fromOptional(value.snapshot, toBlob),
        updates: value.updates.map(toBlob)
    };
}

function toKanbanCardInput(value: KanbanCardInput): CandidKanbanCardInput {
    return {
        title: value.title,
        description: toOptional(value.description ?? undefined),
        assignedTo: value.assignedTo ?? [],
        docId: toOptional(value.docId ?? undefined),
        eventId: toOptional(value.eventId ?? undefined),
        dueDateUtc: toOptional(value.dueDateUtc ?? undefined)
    };
}

function fromKanbanCard(value: CandidKanbanCard): KanbanCard {
    return {
        id: value.id,
        title: value.title,
        description: fromOptional(value.description, (description) => description),
        createdBy: value.createdBy,
        assignedTo: value.assignedTo,
        docId: fromOptional(value.docId, (id) => id),
        eventId: fromOptional(value.eventId, (id) => id),
        dueDateUtc: fromOptional(value.dueDateUtc, (date) => date),
        createdAt: value.createdAt,
        updatedAt: value.updatedAt
    };
}

function fromCommunityBoardSummary(value: CandidCommunityBoardSummary): CommunityBoardSummary {
    return {
        id: value.id,
        communityId: value.communityId,
        title: value.title,
        owner: value.owner,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        archived: value.archived,
        role: fromWorkspaceRole(value.role),
        communityShare: fromOptional(value.communityShare, fromWorkspaceRole),
        columnCount: value.columnCount,
        cardCount: value.cardCount
    };
}

function fromCommunityBoardPayload(value: CandidCommunityBoardPayload): CommunityBoardPayload {
    return {
        id: value.id,
        communityId: value.communityId,
        title: value.title,
        owner: value.owner,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        archived: value.archived,
        role: fromWorkspaceRole(value.role),
        communityShare: fromOptional(value.communityShare, fromWorkspaceRole),
        publicToken: fromOptional(value.publicToken, (token) => token),
        columnCount: BigInt(value.columns.length),
        cardCount: BigInt(value.cards.length),
        access: value.access.map(fromWorkspaceAccessEntry),
        columns: value.columns,
        cards: value.cards.map(fromKanbanCard)
    };
}

function toCommunityEventInput(value: CommunityEventInput): CandidCommunityEventInput {
    return {
        title: value.title,
        description: toOptional(value.description ?? undefined),
        location: toOptional(value.location ?? undefined),
        startUtc: value.startUtc,
        endUtc: value.endUtc,
        allDay: value.allDay
    };
}

function fromCommunityEventPayload(value: CandidCommunityEventPayload): CommunityEventPayload {
    return {
        id: value.id,
        communityId: value.communityId,
        title: value.title,
        description: fromOptional(value.description, (description) => description),
        location: fromOptional(value.location, (location) => location),
        owner: value.owner,
        startUtc: value.startUtc,
        endUtc: value.endUtc,
        allDay: value.allDay,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
        archived: value.archived,
        role: fromWorkspaceRole(value.role),
        access: value.access.map(fromWorkspaceAccessEntry),
        communityShare: fromOptional(value.communityShare, fromWorkspaceRole)
    };
}

export interface backendInterface {
    addCampaignUpdate(campaignId: bigint, content: string): Promise<void>;
    addCommunityBoardCard(communityId: bigint, boardId: bigint, columnId: bigint, input: KanbanCardInput): Promise<KanbanCard>;
    addCommunityBoardColumn(communityId: bigint, boardId: bigint, title: string): Promise<KanbanColumn>;
    appendCommunityDocumentUpdate(communityId: bigint, documentId: bigint, update: Uint8Array | number[]): Promise<bigint>;
    archiveCommunityBoard(communityId: bigint, boardId: bigint): Promise<void>;
    archiveCommunityDocument(communityId: bigint, documentId: bigint): Promise<void>;
    archiveCommunityEvent(communityId: bigint, eventId: bigint): Promise<void>;
    bootstrapPlatformAdmin(): Promise<void>;
    canFinalizeCampaign(campaignId: bigint): Promise<boolean>;
    contributeToCampaign(campaignId: bigint, amount: bigint): Promise<void>;
    createCampaign(communityId: bigint, title: string, description: string, goalAmount: bigint, deadlineNs: bigint): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createCommunity(name: string, policy: string): Promise<void>;
    createCommunityBoard(communityId: bigint, title: string): Promise<bigint>;
    createCommunityDocument(communityId: bigint, title: string): Promise<bigint>;
    createCommunityEvent(communityId: bigint, input: CommunityEventInput): Promise<bigint>;
    createProposal(communityId: bigint, title: string, description: string, overrides: ProposalOverrides | null): Promise<void>;
    deleteCommunityBoardCard(communityId: bigint, boardId: bigint, cardId: bigint): Promise<void>;
    deleteCommunityBoardColumn(communityId: bigint, boardId: bigint, columnId: bigint): Promise<void>;
    finalizeCampaign(campaignId: bigint): Promise<void>;
    finalizeProposal(proposalId: bigint): Promise<void>;
    getCallerCommunityRole(communityId: bigint): Promise<CommunityRole | null>;
    getCallerPlatformRole(): Promise<PlatformRole | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCampaignById(campaignId: bigint): Promise<Campaign | null>;
    getCampaignContributions(campaignId: bigint): Promise<Array<Contribution>>;
    getCampaignUpdates(campaignId: bigint): Promise<Array<CampaignUpdate>>;
    getCommunityAccess(communityId: bigint): Promise<CommunityAccess>;
    getCommunityBoard(communityId: bigint, boardId: bigint): Promise<CommunityBoardPayload | null>;
    getCommunityById(id: bigint): Promise<Community | null>;
    getCommunityDocument(communityId: bigint, documentId: bigint): Promise<CommunityDocumentPayload | null>;
    getCommunityEvent(communityId: bigint, eventId: bigint): Promise<CommunityEventPayload | null>;
    getPublicCommunityBoard(token: string): Promise<CommunityBoardPayload | null>;
    getProposalById(proposalId: bigint): Promise<Proposal | null>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerPlatformAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    leaveCommunity(communityId: bigint): Promise<void>;
    listAllUsers(): Promise<Array<[Principal, UserProfile]>>;
    listCampaignsByCommunity(communityId: bigint): Promise<Array<Campaign>>;
    listCommunities(): Promise<Array<Community>>;
    listCommunityBoards(communityId: bigint): Promise<Array<CommunityBoardSummary>>;
    listCommunityDocuments(communityId: bigint): Promise<Array<CommunityDocumentSummary>>;
    listCommunityEvents(communityId: bigint): Promise<Array<CommunityEventPayload>>;
    listCommunityMembers(communityId: bigint): Promise<Array<CommunityMember>>;
    listPlatformAdmins(): Promise<Array<Principal>>;
    listProposalsByCommunity(communityId: bigint): Promise<Array<Proposal>>;
    moveCommunityBoardCard(communityId: bigint, boardId: bigint, cardId: bigint, toColumnId: bigint, toIndex: bigint): Promise<void>;
    renameCommunityBoard(communityId: bigint, boardId: bigint, title: string): Promise<void>;
    renameCommunityBoardColumn(communityId: bigint, boardId: bigint, columnId: bigint, title: string): Promise<void>;
    renameCommunityDocument(communityId: bigint, documentId: bigint, title: string): Promise<void>;
    reorderCommunityBoardColumns(communityId: bigint, boardId: bigint, columnIds: Array<bigint>): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveCommunityDocumentSnapshot(communityId: bigint, documentId: bigint, snapshot: Uint8Array | number[], compactThroughVersion: bigint): Promise<void>;
    setCommunityBoardGrant(communityId: bigint, boardId: bigint, user: Principal, role: WorkspaceRole | null): Promise<void>;
    setCommunityBoardPublicLink(communityId: bigint, boardId: bigint, token: string | null): Promise<string | null>;
    setCommunityBoardShare(communityId: bigint, boardId: bigint, role: WorkspaceRole | null): Promise<WorkspaceRole | null>;
    setCommunityDocumentGrant(communityId: bigint, documentId: bigint, user: Principal, role: WorkspaceRole | null): Promise<void>;
    setCommunityDocumentParent(communityId: bigint, documentId: bigint, parentId: bigint | null): Promise<bigint | null>;
    setCommunityDocumentShare(communityId: bigint, documentId: bigint, role: WorkspaceRole | null): Promise<WorkspaceRole | null>;
    setCommunityEventGrant(communityId: bigint, eventId: bigint, user: Principal, role: WorkspaceRole | null): Promise<void>;
    setCommunityEventShare(communityId: bigint, eventId: bigint, role: WorkspaceRole | null): Promise<WorkspaceRole | null>;
    setCommunityRole(communityId: bigint, user: Principal, role: CommunityRole | null): Promise<void>;
    setPlatformAdmin(user: Principal, enabled: boolean): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateCommunityBoardCard(communityId: bigint, boardId: bigint, cardId: bigint, input: KanbanCardInput): Promise<void>;
    updateCommunityEvent(communityId: bigint, eventId: bigint, input: CommunityEventInput): Promise<void>;
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

    async addCommunityBoardCard(communityId: bigint, boardId: bigint, columnId: bigint, input: KanbanCardInput): Promise<KanbanCard> {
        return this.handle(async () => fromKanbanCard(await this.actor.addCommunityBoardCard(communityId, boardId, columnId, toKanbanCardInput(input))));
    }

    async addCommunityBoardColumn(communityId: bigint, boardId: bigint, title: string): Promise<KanbanColumn> {
        return this.handle(() => this.actor.addCommunityBoardColumn(communityId, boardId, title));
    }

    async appendCommunityDocumentUpdate(communityId: bigint, documentId: bigint, update: Uint8Array | number[]): Promise<bigint> {
        return this.handle(() => this.actor.appendCommunityDocumentUpdate(communityId, documentId, update));
    }

    async archiveCommunityBoard(communityId: bigint, boardId: bigint): Promise<void> {
        return this.handle(() => this.actor.archiveCommunityBoard(communityId, boardId));
    }

    async archiveCommunityDocument(communityId: bigint, documentId: bigint): Promise<void> {
        return this.handle(() => this.actor.archiveCommunityDocument(communityId, documentId));
    }

    async archiveCommunityEvent(communityId: bigint, eventId: bigint): Promise<void> {
        return this.handle(() => this.actor.archiveCommunityEvent(communityId, eventId));
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

    async createCommunityBoard(communityId: bigint, title: string): Promise<bigint> {
        return this.handle(() => this.actor.createCommunityBoard(communityId, title));
    }

    async createCommunityDocument(communityId: bigint, title: string): Promise<bigint> {
        return this.handle(() => this.actor.createCommunityDocument(communityId, title));
    }

    async createCommunityEvent(communityId: bigint, input: CommunityEventInput): Promise<bigint> {
        return this.handle(() => this.actor.createCommunityEvent(communityId, toCommunityEventInput(input)));
    }

    async createProposal(communityId: bigint, title: string, description: string, overrides: ProposalOverrides | null): Promise<void> {
        return this.handle(() =>
            this.actor.createProposal(communityId, title, description, toOptional(overrides == null ? undefined : toProposalOverrides(overrides)))
        );
    }

    async deleteCommunityBoardCard(communityId: bigint, boardId: bigint, cardId: bigint): Promise<void> {
        return this.handle(() => this.actor.deleteCommunityBoardCard(communityId, boardId, cardId));
    }

    async deleteCommunityBoardColumn(communityId: bigint, boardId: bigint, columnId: bigint): Promise<void> {
        return this.handle(() => this.actor.deleteCommunityBoardColumn(communityId, boardId, columnId));
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
        return this.handle(async () =>
            fromOptional<CandidUserProfile, UserProfile>(await this.actor.getCallerUserProfile(), (value) => value)
        );
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

    async getCommunityBoard(communityId: bigint, boardId: bigint): Promise<CommunityBoardPayload | null> {
        return this.handle(async () => fromOptional(await this.actor.getCommunityBoard(communityId, boardId), fromCommunityBoardPayload));
    }

    async getCommunityById(id: bigint): Promise<Community | null> {
        return this.handle(async () =>
            fromOptional<CandidCommunity, Community>(await this.actor.getCommunityById(id), (value) => value)
        );
    }

    async getCommunityDocument(communityId: bigint, documentId: bigint): Promise<CommunityDocumentPayload | null> {
        return this.handle(async () => fromOptional(await this.actor.getCommunityDocument(communityId, documentId), fromCommunityDocumentPayload));
    }

    async getCommunityEvent(communityId: bigint, eventId: bigint): Promise<CommunityEventPayload | null> {
        return this.handle(async () => fromOptional(await this.actor.getCommunityEvent(communityId, eventId), fromCommunityEventPayload));
    }

    async getPublicCommunityBoard(token: string): Promise<CommunityBoardPayload | null> {
        return this.handle(async () => fromOptional(await this.actor.getPublicCommunityBoard(token), fromCommunityBoardPayload));
    }

    async getProposalById(proposalId: bigint): Promise<Proposal | null> {
        return this.handle(async () => fromOptional(await this.actor.getProposalById(proposalId), fromProposal));
    }

    async getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus> {
        return this.handle(() => this.actor.getStripeSessionStatus(sessionId));
    }

    async getUserProfile(user: Principal): Promise<UserProfile | null> {
        return this.handle(async () =>
            fromOptional<CandidUserProfile, UserProfile>(await this.actor.getUserProfile(user), (value) => value)
        );
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

    async listCommunityBoards(communityId: bigint): Promise<Array<CommunityBoardSummary>> {
        return this.handle(async () => (await this.actor.listCommunityBoards(communityId)).map(fromCommunityBoardSummary));
    }

    async listCommunityDocuments(communityId: bigint): Promise<Array<CommunityDocumentSummary>> {
        return this.handle(async () => (await this.actor.listCommunityDocuments(communityId)).map(fromCommunityDocumentSummary));
    }

    async listCommunityEvents(communityId: bigint): Promise<Array<CommunityEventPayload>> {
        return this.handle(async () => (await this.actor.listCommunityEvents(communityId)).map(fromCommunityEventPayload));
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

    async moveCommunityBoardCard(communityId: bigint, boardId: bigint, cardId: bigint, toColumnId: bigint, toIndex: bigint): Promise<void> {
        return this.handle(() => this.actor.moveCommunityBoardCard(communityId, boardId, cardId, toColumnId, toIndex));
    }

    async renameCommunityBoard(communityId: bigint, boardId: bigint, title: string): Promise<void> {
        return this.handle(() => this.actor.renameCommunityBoard(communityId, boardId, title));
    }

    async renameCommunityBoardColumn(communityId: bigint, boardId: bigint, columnId: bigint, title: string): Promise<void> {
        return this.handle(() => this.actor.renameCommunityBoardColumn(communityId, boardId, columnId, title));
    }

    async renameCommunityDocument(communityId: bigint, documentId: bigint, title: string): Promise<void> {
        return this.handle(() => this.actor.renameCommunityDocument(communityId, documentId, title));
    }

    async reorderCommunityBoardColumns(communityId: bigint, boardId: bigint, columnIds: Array<bigint>): Promise<void> {
        return this.handle(() => this.actor.reorderCommunityBoardColumns(communityId, boardId, columnIds));
    }

    async saveCallerUserProfile(profile: UserProfile): Promise<void> {
        return this.handle(() => this.actor.saveCallerUserProfile(profile));
    }

    async saveCommunityDocumentSnapshot(communityId: bigint, documentId: bigint, snapshot: Uint8Array | number[], compactThroughVersion: bigint): Promise<void> {
        return this.handle(() => this.actor.saveCommunityDocumentSnapshot(communityId, documentId, snapshot, compactThroughVersion));
    }

    async setCommunityBoardGrant(communityId: bigint, boardId: bigint, user: Principal, role: WorkspaceRole | null): Promise<void> {
        return this.handle(() => this.actor.setCommunityBoardGrant(communityId, boardId, user, toOptional(role == null ? undefined : toWorkspaceRole(role))));
    }

    async setCommunityBoardPublicLink(communityId: bigint, boardId: bigint, token: string | null): Promise<string | null> {
        return this.handle(async () =>
            fromOptional(await this.actor.setCommunityBoardPublicLink(communityId, boardId, toOptional(token ?? undefined)), (value) => value)
        );
    }

    async setCommunityBoardShare(communityId: bigint, boardId: bigint, role: WorkspaceRole | null): Promise<WorkspaceRole | null> {
        return this.handle(async () =>
            fromOptional(await this.actor.setCommunityBoardShare(communityId, boardId, toOptional(role == null ? undefined : toWorkspaceRole(role))), fromWorkspaceRole)
        );
    }

    async setCommunityDocumentGrant(communityId: bigint, documentId: bigint, user: Principal, role: WorkspaceRole | null): Promise<void> {
        return this.handle(() => this.actor.setCommunityDocumentGrant(communityId, documentId, user, toOptional(role == null ? undefined : toWorkspaceRole(role))));
    }

    async setCommunityDocumentParent(communityId: bigint, documentId: bigint, parentId: bigint | null): Promise<bigint | null> {
        return this.handle(async () =>
            fromOptional(await this.actor.setCommunityDocumentParent(communityId, documentId, toOptional(parentId ?? undefined)), (value) => value)
        );
    }

    async setCommunityDocumentShare(communityId: bigint, documentId: bigint, role: WorkspaceRole | null): Promise<WorkspaceRole | null> {
        return this.handle(async () =>
            fromOptional(await this.actor.setCommunityDocumentShare(communityId, documentId, toOptional(role == null ? undefined : toWorkspaceRole(role))), fromWorkspaceRole)
        );
    }

    async setCommunityEventGrant(communityId: bigint, eventId: bigint, user: Principal, role: WorkspaceRole | null): Promise<void> {
        return this.handle(() => this.actor.setCommunityEventGrant(communityId, eventId, user, toOptional(role == null ? undefined : toWorkspaceRole(role))));
    }

    async setCommunityEventShare(communityId: bigint, eventId: bigint, role: WorkspaceRole | null): Promise<WorkspaceRole | null> {
        return this.handle(async () =>
            fromOptional(await this.actor.setCommunityEventShare(communityId, eventId, toOptional(role == null ? undefined : toWorkspaceRole(role))), fromWorkspaceRole)
        );
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

    async updateCommunityBoardCard(communityId: bigint, boardId: bigint, cardId: bigint, input: KanbanCardInput): Promise<void> {
        return this.handle(() => this.actor.updateCommunityBoardCard(communityId, boardId, cardId, toKanbanCardInput(input)));
    }

    async updateCommunityEvent(communityId: bigint, eventId: bigint, input: CommunityEventInput): Promise<void> {
        return this.handle(() => this.actor.updateCommunityEvent(communityId, eventId, toCommunityEventInput(input)));
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
