import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Principal } from '@dfinity/principal';
import { useActor } from './useActor';
import {
    Campaign,
    CampaignUpdate,
    Community,
    CommunityAccess,
    CommunityMember,
    CommunityRole,
    PlatformRole,
    Proposal,
    ProposalOverrides,
    Contribution,
    UserProfile
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
