export const idlFactory = ({ IDL }) => {
  const KanbanCardInput = IDL.Record({
    'eventId' : IDL.Opt(IDL.Nat),
    'title' : IDL.Text,
    'assignedTo' : IDL.Vec(IDL.Principal),
    'description' : IDL.Opt(IDL.Text),
    'docId' : IDL.Opt(IDL.Nat),
    'dueDateUtc' : IDL.Opt(IDL.Int),
  });
  const KanbanCard = IDL.Record({
    'id' : IDL.Nat,
    'eventId' : IDL.Opt(IDL.Nat),
    'title' : IDL.Text,
    'assignedTo' : IDL.Vec(IDL.Principal),
    'createdAt' : IDL.Int,
    'createdBy' : IDL.Principal,
    'description' : IDL.Opt(IDL.Text),
    'updatedAt' : IDL.Int,
    'docId' : IDL.Opt(IDL.Nat),
    'dueDateUtc' : IDL.Opt(IDL.Int),
  });
  const KanbanColumn = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'cardIds' : IDL.Vec(IDL.Nat),
  });
  const ShoppingItem = IDL.Record({
    'productName' : IDL.Text,
    'currency' : IDL.Text,
    'quantity' : IDL.Nat,
    'priceInCents' : IDL.Nat,
    'productDescription' : IDL.Text,
  });
  const CommunityEventInput = IDL.Record({
    'title' : IDL.Text,
    'allDay' : IDL.Bool,
    'startUtc' : IDL.Int,
    'description' : IDL.Opt(IDL.Text),
    'location' : IDL.Opt(IDL.Text),
    'endUtc' : IDL.Int,
  });
  const CampaignVisibility = IDL.Variant({
    'publicCampaign' : IDL.Null,
    'community' : IDL.Null,
  });
  const FundraisingCampaignInput = IDL.Record({
    'impact' : IDL.Text,
    'title' : IDL.Text,
    'creatorContact' : IDL.Opt(IDL.Text),
    'currency' : IDL.Text,
    'goalAmount' : IDL.Nat,
    'deadlineNs' : IDL.Int,
    'creatorName' : IDL.Text,
    'mediaUrl' : IDL.Opt(IDL.Text),
    'story' : IDL.Text,
    'shortDescription' : IDL.Text,
    'fundsUse' : IDL.Text,
    'visibility' : CampaignVisibility,
  });
  const ProposalOverrides = IDL.Record({
    'passPct' : IDL.Opt(IDL.Nat),
    'windowNs' : IDL.Opt(IDL.Nat),
    'quorum' : IDL.Opt(IDL.Nat),
  });
  const CommunityRole = IDL.Variant({
    'member' : IDL.Null,
    'communityAdmin' : IDL.Null,
  });
  const PlatformRole = IDL.Variant({ 'platformAdmin' : IDL.Null });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
  const CampaignState = IDL.Variant({
    'active' : IDL.Null,
    'expired' : IDL.Null,
    'successful' : IDL.Null,
    'failed' : IDL.Null,
  });
  const Campaign = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'creator' : IDL.Principal,
    'goalAmount' : IDL.Nat,
    'communityId' : IDL.Nat,
    'deadlineNs' : IDL.Int,
    'createdNs' : IDL.Int,
    'description' : IDL.Text,
    'totalRaised' : IDL.Nat,
    'state' : CampaignState,
  });
  const Contribution = IDL.Record({
    'amount' : IDL.Nat,
    'timestampNs' : IDL.Int,
    'contributor' : IDL.Principal,
  });
  const CampaignUpdate = IDL.Record({
    'id' : IDL.Nat,
    'creator' : IDL.Principal,
    'content' : IDL.Text,
    'campaignId' : IDL.Nat,
    'timestampNs' : IDL.Int,
  });
  const CommunityAccess = IDL.Record({
    'canCreateCampaign' : IDL.Bool,
    'canContributeToCampaign' : IDL.Bool,
    'communityRole' : IDL.Opt(CommunityRole),
    'canLeaveCommunity' : IDL.Bool,
    'canManageMembership' : IDL.Bool,
    'isPlatformAdmin' : IDL.Bool,
    'canCreateProposal' : IDL.Bool,
    'canVoteOnProposal' : IDL.Bool,
  });
  const WorkspaceRole = IDL.Variant({
    'owner' : IDL.Null,
    'editor' : IDL.Null,
    'viewer' : IDL.Null,
  });
  const WorkspaceAccessEntry = IDL.Record({
    'role' : WorkspaceRole,
    'user' : IDL.Principal,
  });
  const CommunityBoardPayload = IDL.Record({
    'id' : IDL.Nat,
    'access' : IDL.Vec(WorkspaceAccessEntry),
    'title' : IDL.Text,
    'communityId' : IDL.Nat,
    'owner' : IDL.Principal,
    'cards' : IDL.Vec(KanbanCard),
    'createdAt' : IDL.Int,
    'role' : WorkspaceRole,
    'publicToken' : IDL.Opt(IDL.Text),
    'updatedAt' : IDL.Int,
    'communityShare' : IDL.Opt(WorkspaceRole),
    'archived' : IDL.Bool,
    'columns' : IDL.Vec(KanbanColumn),
  });
  const Community = IDL.Record({
    'id' : IDL.Nat,
    'members' : IDL.Vec(IDL.Principal),
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'policy' : IDL.Text,
  });
  const CommunityDocumentPayload = IDL.Record({
    'id' : IDL.Nat,
    'access' : IDL.Vec(WorkspaceAccessEntry),
    'title' : IDL.Text,
    'communityId' : IDL.Nat,
    'snapshot' : IDL.Opt(IDL.Vec(IDL.Nat8)),
    'owner' : IDL.Principal,
    'createdAt' : IDL.Int,
    'role' : WorkspaceRole,
    'version' : IDL.Nat,
    'updatedAt' : IDL.Int,
    'updates' : IDL.Vec(IDL.Vec(IDL.Nat8)),
    'communityShare' : IDL.Opt(WorkspaceRole),
    'parentId' : IDL.Opt(IDL.Nat),
    'archived' : IDL.Bool,
  });
  const CommunityEventPayload = IDL.Record({
    'id' : IDL.Nat,
    'access' : IDL.Vec(WorkspaceAccessEntry),
    'title' : IDL.Text,
    'communityId' : IDL.Nat,
    'owner' : IDL.Principal,
    'allDay' : IDL.Bool,
    'startUtc' : IDL.Int,
    'createdAt' : IDL.Int,
    'role' : WorkspaceRole,
    'description' : IDL.Opt(IDL.Text),
    'publicToken' : IDL.Opt(IDL.Text),
    'updatedAt' : IDL.Int,
    'communityShare' : IDL.Opt(WorkspaceRole),
    'location' : IDL.Opt(IDL.Text),
    'archived' : IDL.Bool,
    'endUtc' : IDL.Int,
  });
  const CampaignContributionPayload = IDL.Record({
    'contributorName' : IDL.Text,
    'amount' : IDL.Nat,
    'timestampNs' : IDL.Int,
  });
  const CampaignUpdatePayload = IDL.Record({
    'id' : IDL.Nat,
    'content' : IDL.Text,
    'campaignId' : IDL.Nat,
    'creatorName' : IDL.Text,
    'timestampNs' : IDL.Int,
  });
  const FundraisingCampaignPayload = IDL.Record({
    'id' : IDL.Nat,
    'impact' : IDL.Text,
    'canManagePublicLink' : IDL.Bool,
    'title' : IDL.Text,
    'creator' : IDL.Opt(IDL.Principal),
    'creatorContact' : IDL.Opt(IDL.Text),
    'currency' : IDL.Text,
    'goalAmount' : IDL.Nat,
    'communityId' : IDL.Nat,
    'contributions' : IDL.Vec(CampaignContributionPayload),
    'deadlineNs' : IDL.Int,
    'createdNs' : IDL.Int,
    'canEdit' : IDL.Bool,
    'creatorName' : IDL.Text,
    'publicToken' : IDL.Opt(IDL.Text),
    'mediaUrl' : IDL.Opt(IDL.Text),
    'totalRaised' : IDL.Nat,
    'updatedNs' : IDL.Int,
    'state' : CampaignState,
    'story' : IDL.Text,
    'shortDescription' : IDL.Text,
    'updates' : IDL.Vec(CampaignUpdatePayload),
    'fundsUse' : IDL.Text,
    'canContribute' : IDL.Bool,
    'visibility' : CampaignVisibility,
    'archived' : IDL.Bool,
  });
  const ProposalState = IDL.Variant({
    'active' : IDL.Null,
    'pendingFinalization' : IDL.Null,
    'failed' : IDL.Null,
    'passed' : IDL.Null,
  });
  const Proposal = IDL.Record({
    'id' : IDL.Nat,
    'no' : IDL.Nat,
    'yes' : IDL.Nat,
    'title' : IDL.Text,
    'creator' : IDL.Principal,
    'communityId' : IDL.Nat,
    'startNs' : IDL.Int,
    'description' : IDL.Text,
    'endNs' : IDL.Int,
    'passPct' : IDL.Nat,
    'state' : ProposalState,
    'quorum' : IDL.Nat,
  });
  const StripeSessionStatus = IDL.Variant({
    'completed' : IDL.Record({
      'userPrincipal' : IDL.Opt(IDL.Text),
      'response' : IDL.Text,
    }),
    'failed' : IDL.Record({ 'error' : IDL.Text }),
  });
  const CommunityBoardSummary = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'communityId' : IDL.Nat,
    'owner' : IDL.Principal,
    'createdAt' : IDL.Int,
    'role' : WorkspaceRole,
    'updatedAt' : IDL.Int,
    'cardCount' : IDL.Nat,
    'communityShare' : IDL.Opt(WorkspaceRole),
    'columnCount' : IDL.Nat,
    'archived' : IDL.Bool,
  });
  const CommunityDocumentSummary = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'communityId' : IDL.Nat,
    'owner' : IDL.Principal,
    'createdAt' : IDL.Int,
    'role' : WorkspaceRole,
    'version' : IDL.Nat,
    'updatedAt' : IDL.Int,
    'communityShare' : IDL.Opt(WorkspaceRole),
    'parentId' : IDL.Opt(IDL.Nat),
    'archived' : IDL.Bool,
  });
  const CommunityMember = IDL.Record({
    'principal' : IDL.Principal,
    'role' : CommunityRole,
    'profile' : IDL.Opt(UserProfile),
  });
  const StripeConfiguration = IDL.Record({
    'allowedCountries' : IDL.Vec(IDL.Text),
    'secretKey' : IDL.Text,
  });
  const Header = IDL.Record({ 'value' : IDL.Text, 'name' : IDL.Text });
  const TransformationOutput = IDL.Record({
    'status' : IDL.Nat,
    'body' : IDL.Vec(IDL.Nat8),
    'headers' : IDL.Vec(Header),
  });
  const TransformationInput = IDL.Record({
    'context' : IDL.Vec(IDL.Nat8),
    'response' : TransformationOutput,
  });
  return IDL.Service({
    'addCampaignUpdate' : IDL.Func([IDL.Nat, IDL.Text], [], []),
    'addCommunityBoardCard' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, KanbanCardInput],
        [KanbanCard],
        [],
      ),
    'addCommunityBoardColumn' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Text],
        [KanbanColumn],
        [],
      ),
    'appendCommunityDocumentUpdate' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Vec(IDL.Nat8)],
        [IDL.Nat],
        [],
      ),
    'archiveCampaign' : IDL.Func([IDL.Nat, IDL.Nat], [], []),
    'archiveCommunityBoard' : IDL.Func([IDL.Nat, IDL.Nat], [], []),
    'archiveCommunityDocument' : IDL.Func([IDL.Nat, IDL.Nat], [], []),
    'archiveCommunityEvent' : IDL.Func([IDL.Nat, IDL.Nat], [], []),
    'bootstrapPlatformAdmin' : IDL.Func([], [], []),
    'canFinalizeCampaign' : IDL.Func([IDL.Nat], [IDL.Bool], ['query']),
    'contributeToCampaign' : IDL.Func([IDL.Nat, IDL.Nat], [], []),
    'contributeToPublicCampaign' : IDL.Func([IDL.Text, IDL.Nat], [], []),
    'createCampaign' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Nat, IDL.Int],
        [],
        [],
      ),
    'createCheckoutSession' : IDL.Func(
        [IDL.Vec(ShoppingItem), IDL.Text, IDL.Text],
        [IDL.Text],
        [],
      ),
    'createCommunity' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'createCommunityBoard' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Nat], []),
    'createCommunityDocument' : IDL.Func([IDL.Nat, IDL.Text], [IDL.Nat], []),
    'createCommunityEvent' : IDL.Func(
        [IDL.Nat, CommunityEventInput],
        [IDL.Nat],
        [],
      ),
    'createFundraisingCampaign' : IDL.Func(
        [IDL.Nat, FundraisingCampaignInput],
        [IDL.Nat],
        [],
      ),
    'createProposal' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Opt(ProposalOverrides)],
        [],
        [],
      ),
    'deleteCommunityBoardCard' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Nat], [], []),
    'deleteCommunityBoardColumn' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat],
        [],
        [],
      ),
    'finalizeCampaign' : IDL.Func([IDL.Nat], [], []),
    'finalizeProposal' : IDL.Func([IDL.Nat], [], []),
    'getCallerCommunityRole' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(CommunityRole)],
        ['query'],
      ),
    'getCallerPlatformRole' : IDL.Func([], [IDL.Opt(PlatformRole)], ['query']),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCampaignById' : IDL.Func([IDL.Nat], [IDL.Opt(Campaign)], ['query']),
    'getCampaignContributions' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(Contribution)],
        ['query'],
      ),
    'getCampaignUpdates' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CampaignUpdate)],
        ['query'],
      ),
    'getCommunityAccess' : IDL.Func([IDL.Nat], [CommunityAccess], ['query']),
    'getCommunityBoard' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Opt(CommunityBoardPayload)],
        ['query'],
      ),
    'getCommunityById' : IDL.Func([IDL.Nat], [IDL.Opt(Community)], ['query']),
    'getCommunityDocument' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Opt(CommunityDocumentPayload)],
        ['query'],
      ),
    'getCommunityEvent' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Opt(CommunityEventPayload)],
        ['query'],
      ),
    'getFundraisingCampaign' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Opt(FundraisingCampaignPayload)],
        ['query'],
      ),
    'getProposalById' : IDL.Func([IDL.Nat], [IDL.Opt(Proposal)], ['query']),
    'getPublicCampaign' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(FundraisingCampaignPayload)],
        ['query'],
      ),
    'getPublicCommunityBoard' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(CommunityBoardPayload)],
        ['query'],
      ),
    'getPublicCommunityEvent' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(CommunityEventPayload)],
        ['query'],
      ),
    'getStripeSessionStatus' : IDL.Func([IDL.Text], [StripeSessionStatus], []),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'isCallerPlatformAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'isStripeConfigured' : IDL.Func([], [IDL.Bool], ['query']),
    'leaveCommunity' : IDL.Func([IDL.Nat], [], []),
    'listAllUsers' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserProfile))],
        ['query'],
      ),
    'listCampaignsByCommunity' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(Campaign)],
        ['query'],
      ),
    'listCommunities' : IDL.Func([], [IDL.Vec(Community)], ['query']),
    'listCommunityBoards' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommunityBoardSummary)],
        ['query'],
      ),
    'listCommunityDocuments' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommunityDocumentSummary)],
        ['query'],
      ),
    'listCommunityEvents' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommunityEventPayload)],
        ['query'],
      ),
    'listCommunityMembers' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommunityMember)],
        ['query'],
      ),
    'listFundraisingCampaigns' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(FundraisingCampaignPayload)],
        ['query'],
      ),
    'listPlatformAdmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listProposalsByCommunity' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(Proposal)],
        ['query'],
      ),
    'moveCommunityBoardCard' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat, IDL.Nat],
        [],
        [],
      ),
    'renameCommunityBoard' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Text], [], []),
    'renameCommunityBoardColumn' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, IDL.Text],
        [],
        [],
      ),
    'renameCommunityDocument' : IDL.Func([IDL.Nat, IDL.Nat, IDL.Text], [], []),
    'reorderCommunityBoardColumns' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Vec(IDL.Nat)],
        [],
        [],
      ),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'saveCommunityDocumentSnapshot' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Vec(IDL.Nat8), IDL.Nat],
        [],
        [],
      ),
    'setCampaignPublicLink' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(IDL.Text)],
        [IDL.Opt(IDL.Text)],
        [],
      ),
    'setCommunityBoardGrant' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Principal, IDL.Opt(WorkspaceRole)],
        [],
        [],
      ),
    'setCommunityBoardPublicLink' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(IDL.Text)],
        [IDL.Opt(IDL.Text)],
        [],
      ),
    'setCommunityBoardShare' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(WorkspaceRole)],
        [IDL.Opt(WorkspaceRole)],
        [],
      ),
    'setCommunityDocumentGrant' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Principal, IDL.Opt(WorkspaceRole)],
        [],
        [],
      ),
    'setCommunityDocumentParent' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(IDL.Nat)],
        [IDL.Opt(IDL.Nat)],
        [],
      ),
    'setCommunityDocumentShare' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(WorkspaceRole)],
        [IDL.Opt(WorkspaceRole)],
        [],
      ),
    'setCommunityEventGrant' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Principal, IDL.Opt(WorkspaceRole)],
        [],
        [],
      ),
    'setCommunityEventPublicLink' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(IDL.Text)],
        [IDL.Opt(IDL.Text)],
        [],
      ),
    'setCommunityEventShare' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Opt(WorkspaceRole)],
        [IDL.Opt(WorkspaceRole)],
        [],
      ),
    'setCommunityRole' : IDL.Func(
        [IDL.Nat, IDL.Principal, IDL.Opt(CommunityRole)],
        [],
        [],
      ),
    'setPlatformAdmin' : IDL.Func([IDL.Principal, IDL.Bool], [], []),
    'setStripeConfiguration' : IDL.Func([StripeConfiguration], [], []),
    'transform' : IDL.Func(
        [TransformationInput],
        [TransformationOutput],
        ['query'],
      ),
    'updateCommunityBoardCard' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Nat, KanbanCardInput],
        [],
        [],
      ),
    'updateCommunityEvent' : IDL.Func(
        [IDL.Nat, IDL.Nat, CommunityEventInput],
        [],
        [],
      ),
    'updateFundraisingCampaign' : IDL.Func(
        [IDL.Nat, IDL.Nat, FundraisingCampaignInput],
        [],
        [],
      ),
    'voteOnProposal' : IDL.Func([IDL.Nat, IDL.Bool], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
