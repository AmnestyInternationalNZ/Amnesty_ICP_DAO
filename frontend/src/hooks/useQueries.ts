import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Principal } from '@dfinity/principal';
import { useActor } from './useActor';
import {
    Campaign,
    CampaignUpdate,
    Community,
    CommunityAccess,
    CommunityBoardPayload,
    CommunityBoardSummary,
    CommunityDocumentPayload,
    CommunityDocumentSummary,
    CommunityEventInput,
    CommunityEventPayload,
    CommunityMember,
    CommunityRole,
    KanbanCardInput,
    PlatformRole,
    Proposal,
    ProposalOverrides,
    Contribution,
    UserProfile,
    WorkspaceRole
} from '../backend';

function useAuthedActor() {
    const { actor, isFetching, isAuthenticated } = useActor();
    return {
        actor,
        isFetching,
        isAuthenticated,
        enabled: !!actor && !isFetching && isAuthenticated
    };
}

function invalidateCommunity(queryClient: ReturnType<typeof useQueryClient>, communityId?: bigint) {
    queryClient.invalidateQueries({ queryKey: ['communities'] });
    if (communityId !== undefined) {
        const key = communityId.toString();
        queryClient.invalidateQueries({ queryKey: ['community', key] });
        queryClient.invalidateQueries({ queryKey: ['communityAccess', key] });
        queryClient.invalidateQueries({ queryKey: ['communityMembers', key] });
        queryClient.invalidateQueries({ queryKey: ['callerCommunityRole', key] });
        queryClient.invalidateQueries({ queryKey: ['proposals', key] });
        queryClient.invalidateQueries({ queryKey: ['campaigns', key] });
        queryClient.invalidateQueries({ queryKey: ['communityDocuments', key] });
        queryClient.invalidateQueries({ queryKey: ['communityDocument'] });
        queryClient.invalidateQueries({ queryKey: ['communityBoards', key] });
        queryClient.invalidateQueries({ queryKey: ['communityBoard'] });
        queryClient.invalidateQueries({ queryKey: ['communityEvents', key] });
        queryClient.invalidateQueries({ queryKey: ['communityEvent'] });
    }
}

export function useGetCallerUserProfile() {
    const { actor, enabled, isFetching } = useAuthedActor();

    const query = useQuery<UserProfile | null>({
        queryKey: ['currentUserProfile'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCallerUserProfile();
        },
        enabled,
        retry: false
    });

    return {
        ...query,
        isLoading: isFetching || query.isLoading,
        isFetched: enabled && query.isFetched
    };
}

export function useSaveCallerUserProfile() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (profile: UserProfile) => {
            if (!actor) throw new Error('Actor not available');
            return actor.saveCallerUserProfile(profile);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
            queryClient.invalidateQueries({ queryKey: ['allUsers'] });
        }
    });
}

export function useGetCallerPlatformRole() {
    const { actor, enabled } = useAuthedActor();

    return useQuery<PlatformRole | null>({
        queryKey: ['currentPlatformRole'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCallerPlatformRole();
        },
        enabled,
        retry: false,
        staleTime: 30 * 1000
    });
}

export function useIsCallerPlatformAdmin() {
    const { actor, enabled } = useAuthedActor();

    return useQuery<boolean>({
        queryKey: ['isCurrentUserPlatformAdmin'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.isCallerPlatformAdmin();
        },
        enabled,
        retry: false,
        staleTime: 30 * 1000
    });
}

export function useListPlatformAdmins() {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Array<Principal>>({
        queryKey: ['platformAdmins'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listPlatformAdmins();
        },
        enabled,
        retry: false,
        staleTime: 30 * 1000
    });
}

export function useBootstrapPlatformAdmin() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.bootstrapPlatformAdmin();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platformAdmins'] });
            queryClient.invalidateQueries({ queryKey: ['currentPlatformRole'] });
            queryClient.invalidateQueries({ queryKey: ['isCurrentUserPlatformAdmin'] });
        }
    });
}

export function useSetPlatformAdmin() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ user, enabled }: { user: Principal; enabled: boolean }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setPlatformAdmin(user, enabled);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platformAdmins'] });
            queryClient.invalidateQueries({ queryKey: ['currentPlatformRole'] });
            queryClient.invalidateQueries({ queryKey: ['isCurrentUserPlatformAdmin'] });
            queryClient.invalidateQueries({ queryKey: ['communityMembers'] });
            queryClient.invalidateQueries({ queryKey: ['communityAccess'] });
        }
    });
}

export function useGetUserProfile() {
    const { actor } = useActor();

    return useMutation({
        mutationFn: async (user: Principal) => {
            if (!actor) throw new Error('Actor not available');
            return actor.getUserProfile(user);
        }
    });
}

export function useListAllUsers() {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Array<[Principal, UserProfile]>>({
        queryKey: ['allUsers'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listAllUsers();
        },
        enabled,
        retry: false,
        staleTime: 60 * 1000
    });
}

export function useListCommunities() {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Community[]>({
        queryKey: ['communities'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listCommunities();
        },
        enabled,
        retry: false,
        staleTime: 10 * 1000
    });
}

export function useGetCommunityById(id: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Community | null>({
        queryKey: ['community', id.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCommunityById(id);
        },
        enabled,
        retry: false,
        staleTime: 10 * 1000
    });
}

export function useGetCallerCommunityRole(communityId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<CommunityRole | null>({
        queryKey: ['callerCommunityRole', communityId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCallerCommunityRole(communityId);
        },
        enabled,
        retry: false,
        staleTime: 10 * 1000
    });
}

export function useGetCommunityAccess(communityId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<CommunityAccess>({
        queryKey: ['communityAccess', communityId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCommunityAccess(communityId);
        },
        enabled,
        retry: false,
        staleTime: 10 * 1000
    });
}

export function useListCommunityMembers(communityId: bigint | null) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Array<CommunityMember>>({
        queryKey: ['communityMembers', communityId?.toString() ?? 'none'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            if (communityId === null) return [];
            return actor.listCommunityMembers(communityId);
        },
        enabled: enabled && communityId !== null,
        retry: false,
        staleTime: 10 * 1000
    });
}

export function useCreateCommunity() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ name, policy }: { name: string; policy: string }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.createCommunity(name, policy);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['communities'] });
        }
    });
}

export function useSetCommunityRole() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, user, role }: { communityId: bigint; user: Principal; role: CommunityRole | null }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setCommunityRole(communityId, user, role);
        },
        onSuccess: (_, variables) => {
            invalidateCommunity(queryClient, variables.communityId);
        }
    });
}

export function useLeaveCommunity() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (communityId: bigint) => {
            if (!actor) throw new Error('Actor not available');
            return actor.leaveCommunity(communityId);
        },
        onSuccess: (_, communityId) => {
            invalidateCommunity(queryClient, communityId);
        }
    });
}

export function useCreateProposal() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, title, description, overrides }: {
            communityId: bigint;
            title: string;
            description: string;
            overrides?: ProposalOverrides | null;
        }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.createProposal(communityId, title, description, overrides ?? null);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['proposals', variables.communityId.toString()] });
        }
    });
}

export function useListProposalsByCommunity(communityId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Proposal[]>({
        queryKey: ['proposals', communityId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listProposalsByCommunity(communityId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useVoteOnProposal() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ proposalId, voteYes }: { proposalId: bigint; voteYes: boolean }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.voteOnProposal(proposalId, voteYes);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            queryClient.invalidateQueries({ queryKey: ['proposal'] });
        }
    });
}

export function useFinalizeProposal() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (proposalId: bigint) => {
            if (!actor) throw new Error('Actor not available');
            return actor.finalizeProposal(proposalId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['proposals'] });
            queryClient.invalidateQueries({ queryKey: ['proposal'] });
        }
    });
}

export function useGetProposalById(proposalId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Proposal | null>({
        queryKey: ['proposal', proposalId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getProposalById(proposalId);
        },
        enabled,
        retry: false
    });
}

export function useCreateCampaign() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, title, description, goalAmount, deadlineNs }: {
            communityId: bigint;
            title: string;
            description: string;
            goalAmount: bigint;
            deadlineNs: bigint;
        }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.createCampaign(communityId, title, description, goalAmount, deadlineNs);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['campaigns', variables.communityId.toString()] });
        }
    });
}

export function useListCampaignsByCommunity(communityId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Campaign[]>({
        queryKey: ['campaigns', communityId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listCampaignsByCommunity(communityId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useContributeToCampaign() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ campaignId, amount }: { campaignId: bigint; amount: bigint }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.contributeToCampaign(campaignId, amount);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['campaign'] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['campaignContributions'] });
        }
    });
}

export function useGetCampaignById(campaignId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Campaign | null>({
        queryKey: ['campaign', campaignId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCampaignById(campaignId);
        },
        enabled,
        retry: false
    });
}

export function useGetCampaignUpdates(campaignId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Array<CampaignUpdate>>({
        queryKey: ['campaignUpdates', campaignId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCampaignUpdates(campaignId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useGetCampaignContributions(campaignId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<Array<Contribution>>({
        queryKey: ['campaignContributions', campaignId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCampaignContributions(campaignId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useAddCampaignUpdate() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ campaignId, content }: { campaignId: bigint; content: string }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.addCampaignUpdate(campaignId, content);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['campaignUpdates', variables.campaignId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['campaign', variables.campaignId.toString()] });
        }
    });
}

export function useFinalizeCampaign() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (campaignId: bigint) => {
            if (!actor) throw new Error('Actor not available');
            return actor.finalizeCampaign(campaignId);
        },
        onSuccess: (_, campaignId) => {
            queryClient.invalidateQueries({ queryKey: ['campaign', campaignId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['canFinalizeCampaign', campaignId.toString()] });
        }
    });
}

export function useCanFinalizeCampaign(campaignId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<boolean>({
        queryKey: ['canFinalizeCampaign', campaignId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.canFinalizeCampaign(campaignId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useCreateCommunityDocument() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, title }: { communityId: bigint; title: string }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.createCommunityDocument(communityId, title);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityDocuments', variables.communityId.toString()] });
        }
    });
}

export function useListCommunityDocuments(communityId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<CommunityDocumentSummary[]>({
        queryKey: ['communityDocuments', communityId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listCommunityDocuments(communityId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useGetCommunityDocument(communityId: bigint, documentId: bigint | null) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<CommunityDocumentPayload | null>({
        queryKey: ['communityDocument', communityId.toString(), documentId?.toString() ?? 'none'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            if (documentId === null) return null;
            return actor.getCommunityDocument(communityId, documentId);
        },
        enabled: enabled && documentId !== null,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useRenameCommunityDocument() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, documentId, title }: { communityId: bigint; documentId: bigint; title: string }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.renameCommunityDocument(communityId, documentId, title);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityDocuments', variables.communityId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityDocument', variables.communityId.toString(), variables.documentId.toString()] });
        }
    });
}

export function useAppendCommunityDocumentUpdate() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, documentId, update }: { communityId: bigint; documentId: bigint; update: Uint8Array | number[] }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.appendCommunityDocumentUpdate(communityId, documentId, update);
        },
        onSuccess: (_, variables) => {
            // The editor already owns the live Yjs document; refreshing the selected-document
            // query on every autosave rehydrates the DOM and can steal focus/caret position.
            queryClient.invalidateQueries({ queryKey: ['communityDocuments', variables.communityId.toString()] });
        }
    });
}

export function useSaveCommunityDocumentSnapshot() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, documentId, snapshot, compactThroughVersion }: {
            communityId: bigint;
            documentId: bigint;
            snapshot: Uint8Array | number[];
            compactThroughVersion: bigint;
        }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.saveCommunityDocumentSnapshot(communityId, documentId, snapshot, compactThroughVersion);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityDocument', variables.communityId.toString(), variables.documentId.toString()] });
        }
    });
}

export function useSetCommunityDocumentShare() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, documentId, role }: { communityId: bigint; documentId: bigint; role: WorkspaceRole | null }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setCommunityDocumentShare(communityId, documentId, role);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityDocuments', variables.communityId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityDocument', variables.communityId.toString(), variables.documentId.toString()] });
        }
    });
}

export function useSetCommunityDocumentGrant() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, documentId, user, role }: { communityId: bigint; documentId: bigint; user: Principal; role: WorkspaceRole | null }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setCommunityDocumentGrant(communityId, documentId, user, role);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityDocument', variables.communityId.toString(), variables.documentId.toString()] });
        }
    });
}

export function useSetCommunityDocumentParent() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, documentId, parentId }: { communityId: bigint; documentId: bigint; parentId: bigint | null }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setCommunityDocumentParent(communityId, documentId, parentId);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityDocuments', variables.communityId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityDocument', variables.communityId.toString(), variables.documentId.toString()] });
        }
    });
}

export function useArchiveCommunityDocument() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, documentId }: { communityId: bigint; documentId: bigint }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.archiveCommunityDocument(communityId, documentId);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityDocuments', variables.communityId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityDocument', variables.communityId.toString(), variables.documentId.toString()] });
        }
    });
}

export function useCreateCommunityBoard() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, title }: { communityId: bigint; title: string }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.createCommunityBoard(communityId, title);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityBoards', variables.communityId.toString()] });
        }
    });
}

export function useListCommunityBoards(communityId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<CommunityBoardSummary[]>({
        queryKey: ['communityBoards', communityId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listCommunityBoards(communityId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useGetCommunityBoard(communityId: bigint, boardId: bigint | null) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<CommunityBoardPayload | null>({
        queryKey: ['communityBoard', communityId.toString(), boardId?.toString() ?? 'none'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            if (boardId === null) return null;
            return actor.getCommunityBoard(communityId, boardId);
        },
        enabled: enabled && boardId !== null,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useAddCommunityBoardColumn() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, boardId, title }: { communityId: bigint; boardId: bigint; title: string }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.addCommunityBoardColumn(communityId, boardId, title);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityBoard', variables.communityId.toString(), variables.boardId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityBoards', variables.communityId.toString()] });
        }
    });
}

export function useAddCommunityBoardCard() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, boardId, columnId, input }: { communityId: bigint; boardId: bigint; columnId: bigint; input: KanbanCardInput }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.addCommunityBoardCard(communityId, boardId, columnId, input);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityBoard', variables.communityId.toString(), variables.boardId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityBoards', variables.communityId.toString()] });
        }
    });
}

export function useUpdateCommunityBoardCard() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, boardId, cardId, input }: { communityId: bigint; boardId: bigint; cardId: bigint; input: KanbanCardInput }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.updateCommunityBoardCard(communityId, boardId, cardId, input);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityBoard', variables.communityId.toString(), variables.boardId.toString()] });
        }
    });
}

export function useMoveCommunityBoardCard() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, boardId, cardId, toColumnId, toIndex }: {
            communityId: bigint;
            boardId: bigint;
            cardId: bigint;
            toColumnId: bigint;
            toIndex: bigint;
        }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.moveCommunityBoardCard(communityId, boardId, cardId, toColumnId, toIndex);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityBoard', variables.communityId.toString(), variables.boardId.toString()] });
        }
    });
}

export function useSetCommunityBoardShare() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, boardId, role }: { communityId: bigint; boardId: bigint; role: WorkspaceRole | null }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setCommunityBoardShare(communityId, boardId, role);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityBoards', variables.communityId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityBoard', variables.communityId.toString(), variables.boardId.toString()] });
        }
    });
}

export function useCreateCommunityEvent() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, input }: { communityId: bigint; input: CommunityEventInput }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.createCommunityEvent(communityId, input);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityEvents', variables.communityId.toString()] });
        }
    });
}

export function useListCommunityEvents(communityId: bigint) {
    const { actor, enabled } = useAuthedActor();

    return useQuery<CommunityEventPayload[]>({
        queryKey: ['communityEvents', communityId.toString()],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.listCommunityEvents(communityId);
        },
        enabled,
        retry: false,
        staleTime: 5 * 1000
    });
}

export function useUpdateCommunityEvent() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, eventId, input }: { communityId: bigint; eventId: bigint; input: CommunityEventInput }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.updateCommunityEvent(communityId, eventId, input);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityEvents', variables.communityId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityEvent', variables.communityId.toString(), variables.eventId.toString()] });
        }
    });
}

export function useSetCommunityEventShare() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ communityId, eventId, role }: { communityId: bigint; eventId: bigint; role: WorkspaceRole | null }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setCommunityEventShare(communityId, eventId, role);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['communityEvents', variables.communityId.toString()] });
            queryClient.invalidateQueries({ queryKey: ['communityEvent', variables.communityId.toString(), variables.eventId.toString()] });
        }
    });
}
