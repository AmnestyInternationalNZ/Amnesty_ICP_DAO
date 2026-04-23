import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { UserProfile, UserRole, Community, Proposal, ProposalOverrides, Campaign, CampaignUpdate, Contribution } from '../backend';
import { Principal } from '@dfinity/principal';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
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
    },
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ['currentUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30 * 1000,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isCurrentUserAdmin'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30 * 1000,
  });
}

export function useAssignUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role, communityId }: { user: Principal; role: UserRole; communityId?: bigint | null }) => {
      if (!actor) throw new Error('Actor not available');
      
      if (communityId && communityId !== null) {
        console.warn('Per-community role assignment not yet supported by backend, using global assignment');
      }
      
      return actor.assignCallerUserRole(user, role);
    },
    onSuccess: (_, variables) => {
      queryClient.clear();
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['currentUserRole'] });
        queryClient.refetchQueries({ queryKey: ['isCurrentUserAdmin'] });
        queryClient.refetchQueries({ queryKey: ['allUsers'] });
        
        queryClient.refetchQueries({ queryKey: ['communities'] });
        queryClient.refetchQueries({ 
          predicate: (query) => query.queryKey[0] === 'community' || 
                                query.queryKey[0] === 'communityPortal' || 
                                query.queryKey[0] === 'communityMembers'
        });
        
        if (variables.communityId) {
          queryClient.refetchQueries({ queryKey: ['community', variables.communityId.toString()] });
          queryClient.refetchQueries({ queryKey: ['communityPortal', variables.communityId.toString()] });
          queryClient.refetchQueries({ queryKey: ['communityMembers', variables.communityId.toString()] });
        }
        
        if (variables.role === UserRole.user || variables.role === UserRole.guest) {
          queryClient.refetchQueries({ 
            predicate: (query) => 
              query.queryKey[0] === 'communities' || 
              query.queryKey[0] === 'community' || 
              query.queryKey[0] === 'communityPortal' || 
              query.queryKey[0] === 'communityMembers' ||
              query.queryKey[0] === 'proposals'
          });
        }
      }, 300);
    },
  });
}

export function useRemoveMemberFromCommunity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, communityId }: { user: Principal; communityId: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      
      return actor.removeMemberFromCommunity(communityId, user);
    },
    onSuccess: (_, variables) => {
      queryClient.clear();
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['communities'] });
        queryClient.refetchQueries({ queryKey: ['community', variables.communityId.toString()] });
        queryClient.refetchQueries({ queryKey: ['communityPortal', variables.communityId.toString()] });
        queryClient.refetchQueries({ queryKey: ['communityMembers', variables.communityId.toString()] });
        
        queryClient.refetchQueries({ queryKey: ['currentUserRole'] });
        queryClient.refetchQueries({ queryKey: ['isCurrentUserAdmin'] });
        queryClient.refetchQueries({ queryKey: ['allUsers'] });
        
        queryClient.refetchQueries({ 
          predicate: (query) => 
            query.queryKey[0] === 'communities' || 
            query.queryKey[0] === 'community' || 
            query.queryKey[0] === 'communityPortal' || 
            query.queryKey[0] === 'communityMembers' ||
            query.queryKey[0] === 'proposals'
        });
      }, 300);
    },
  });
}

export function useGetUserProfile() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.getUserProfile(user);
    },
  });
}

export function useListAllUsers() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Array<[Principal, UserProfile]>>({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listAllUsers();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 1 * 60 * 1000,
  });
}

export function useListCommunities() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Community[]>({
    queryKey: ['communities'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listCommunities();
    },
    enabled: !!actor && !actorFetching,
    staleTime: 10 * 1000,
  });
}

export function useGetCommunityById(id: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Community | null>({
    queryKey: ['community', id.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCommunityById(id);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 10 * 1000,
    retry: 1,
  });
}

export function useGetCommunityMembers(communityId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<{
    globalAdmins: Array<{ principal: Principal; profile: UserProfile | null }>;
    communityAdmins: Array<{ principal: Principal; profile: UserProfile | null }>;
    votingMembers: Array<{ principal: Principal; profile: UserProfile | null }>;
  }>({
    queryKey: ['communityMembers', communityId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      
      const community = await actor.getCommunityById(communityId);
      if (!community) {
        return {
          globalAdmins: [],
          communityAdmins: [],
          votingMembers: []
        };
      }

      const allUsers = await actor.listAllUsers();
      const userMap = new Map(allUsers.map(([principal, profile]) => [principal.toString(), profile]));

      const uniqueMembers = Array.from(new Set(community.members.map(p => p.toString())))
        .map(principalStr => community.members.find(p => p.toString() === principalStr))
        .filter((p): p is Principal => p !== undefined);

      const votingMembers: Array<{ principal: Principal; profile: UserProfile | null }> = 
        uniqueMembers.map(memberPrincipal => ({
          principal: memberPrincipal,
          profile: userMap.get(memberPrincipal.toString()) || null
        }));

      const globalAdmins: Array<{ principal: Principal; profile: UserProfile | null }> = [{
        principal: community.admin,
        profile: userMap.get(community.admin.toString()) || null
      }];

      const communityAdmins: Array<{ principal: Principal; profile: UserProfile | null }> = [];

      return {
        globalAdmins,
        communityAdmins,
        votingMembers
      };
    },
    enabled: !!actor && !actorFetching,
    staleTime: 5 * 1000,
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
      queryClient.refetchQueries({ queryKey: ['communities'] });
    },
  });
}

export function useJoinCommunity() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.joinCommunity(communityId);
    },
    onSuccess: (_, communityId) => {
      queryClient.invalidateQueries({ queryKey: ['communities'] });
      queryClient.invalidateQueries({ queryKey: ['community', communityId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['communityPortal', communityId.toString()] });
      queryClient.invalidateQueries({ queryKey: ['communityMembers', communityId.toString()] });
      queryClient.refetchQueries({ queryKey: ['communities'] });
      queryClient.refetchQueries({ queryKey: ['community', communityId.toString()] });
      queryClient.refetchQueries({ queryKey: ['communityPortal', communityId.toString()] });
      queryClient.refetchQueries({ queryKey: ['communityMembers', communityId.toString()] });
    },
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
      queryClient.clear();
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['communities'] });
        queryClient.refetchQueries({ queryKey: ['community', communityId.toString()] });
        queryClient.refetchQueries({ queryKey: ['communityPortal', communityId.toString()] });
        queryClient.refetchQueries({ queryKey: ['communityMembers', communityId.toString()] });
        
        queryClient.refetchQueries({ queryKey: ['currentUserRole'] });
        queryClient.refetchQueries({ queryKey: ['isCurrentUserAdmin'] });
        
        queryClient.refetchQueries({ 
          predicate: (query) => 
            query.queryKey[0] === 'communities' || 
            query.queryKey[0] === 'community' || 
            query.queryKey[0] === 'communityPortal' || 
            query.queryKey[0] === 'communityMembers' ||
            query.queryKey[0] === 'proposals'
        });
      }, 300);
    },
  });
}

export function useEnterCommunityPortal(communityId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Community>({
    queryKey: ['communityPortal', communityId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.enterCommunityPortal(communityId);
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: 5 * 1000,
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
      return actor.createProposal(communityId, title, description, overrides || null);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals', variables.communityId.toString()] });
      queryClient.refetchQueries({ queryKey: ['proposals', variables.communityId.toString()] });
    },
  });
}

export function useListProposalsByCommunity(communityId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Proposal[]>({
    queryKey: ['proposals', communityId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listProposalsByCommunity(communityId);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15 * 1000,
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'proposals'
      });
      queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'proposals'
      });
    },
    onError: (error, variables) => {
      if (error && typeof error === 'object' && 'message' in error) {
        const message = (error as any).message;
        if (message && message.includes('already voted')) {
          queryClient.setQueryData(['hasVoted', variables.proposalId.toString()], true);
        }
      }
    },
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
    onSuccess: (_, proposalId) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'proposals'
      });
      queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'proposals'
      });
    },
  });
}

export function useGetProposalById() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (proposalId: bigint) => {
      if (!actor) throw new Error('Actor not available');
      return actor.getProposalById(proposalId);
    },
  });
}

// Campaign Queries

export function useListCampaignsByCommunity(communityId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Campaign[]>({
    queryKey: ['campaigns', communityId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.listCampaignsByCommunity(communityId);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15 * 1000,
  });
}

export function useGetCampaignById(campaignId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Campaign | null>({
    queryKey: ['campaign', campaignId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCampaignById(campaignId);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 10 * 1000,
  });
}

export function useCreateCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      communityId, 
      title, 
      description, 
      goalAmount, 
      deadlineNs 
    }: { 
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
      queryClient.refetchQueries({ queryKey: ['campaigns', variables.communityId.toString()] });
    },
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'campaigns' || 
                              (query.queryKey[0] === 'campaign' && query.queryKey[1] === variables.campaignId.toString()) ||
                              (query.queryKey[0] === 'campaignContributions' && query.queryKey[1] === variables.campaignId.toString()) ||
                              (query.queryKey[0] === 'canFinalizeCampaign' && query.queryKey[1] === variables.campaignId.toString())
      });
      queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'campaigns' || 
                              (query.queryKey[0] === 'campaign' && query.queryKey[1] === variables.campaignId.toString()) ||
                              (query.queryKey[0] === 'campaignContributions' && query.queryKey[1] === variables.campaignId.toString()) ||
                              (query.queryKey[0] === 'canFinalizeCampaign' && query.queryKey[1] === variables.campaignId.toString())
      });
    },
  });
}

export function useGetCampaignContributions(campaignId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Contribution[]>({
    queryKey: ['campaignContributions', campaignId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCampaignContributions(campaignId);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 10 * 1000,
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
      queryClient.refetchQueries({ queryKey: ['campaignUpdates', variables.campaignId.toString()] });
    },
  });
}

export function useGetCampaignUpdates(campaignId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<CampaignUpdate[]>({
    queryKey: ['campaignUpdates', campaignId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCampaignUpdates(campaignId);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 15 * 1000,
  });
}

export function useCanFinalizeCampaign(campaignId: bigint) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['canFinalizeCampaign', campaignId.toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.canFinalizeCampaign(campaignId);
    },
    enabled: !!actor && !actorFetching,
    staleTime: 5 * 1000,
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
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === 'campaigns' || 
                              (query.queryKey[0] === 'campaign' && query.queryKey[1] === campaignId.toString()) ||
                              (query.queryKey[0] === 'canFinalizeCampaign' && query.queryKey[1] === campaignId.toString())
      });
      queryClient.refetchQueries({ 
        predicate: (query) => query.queryKey[0] === 'campaigns' || 
                              (query.queryKey[0] === 'campaign' && query.queryKey[1] === campaignId.toString()) ||
                              (query.queryKey[0] === 'canFinalizeCampaign' && query.queryKey[1] === campaignId.toString())
      });
    },
  });
}
