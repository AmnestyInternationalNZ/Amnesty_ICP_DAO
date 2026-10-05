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
  const CommissionAccess = IDL.Record({
    'capabilities' : IDL.Vec(IDL.Text),
    'name' : IDL.Text,
    'roleId' : IDL.Text,
    'revision' : IDL.Nat,
  });
  const CommissionRole = IDL.Variant({
    'member' : IDL.Null,
    'lead' : IDL.Null,
    'partner' : IDL.Null,
  });
  const CommissionContributionDetail = IDL.Record({
    'id' : IDL.Nat,
    'processSuggestion' : IDL.Bool,
    'documentReference' : IDL.Text,
    'typeId' : IDL.Text,
    'withdrawnAt' : IDL.Opt(IDL.Int),
  });
  const CommissionContributionType = IDL.Record({
    'id' : IDL.Text,
    'name' : IDL.Text,
    'layout' : IDL.Text,
    'guidance' : IDL.Text,
  });
  const CommissionDraftEvidence = IDL.Record({
    'groupId' : IDL.Nat,
    'findings' : IDL.Vec(IDL.Nat),
    'needsReview' : IDL.Bool,
  });
  const CommissionAssignment = IDL.Record({
    'principal' : IDL.Principal,
    'role' : CommissionRole,
  });
  const CommissionGroup = IDL.Record({
    'id' : IDL.Nat,
    'disagreements' : IDL.Text,
    'name' : IDL.Text,
    'stage' : IDL.Nat,
    'draftShared' : IDL.Bool,
    'draft' : IDL.Text,
    'purpose' : IDL.Text,
    'roles' : IDL.Vec(CommissionAssignment),
  });
  const CommissionInput = IDL.Record({
    'participants' : IDL.Text,
    'alias' : IDL.Text,
    'date' : IDL.Text,
    'answers' : IDL.Text,
    'internalConsent' : IDL.Bool,
    'quoteConsent' : IDL.Bool,
    'language' : IDL.Text,
    'themes' : IDL.Text,
    'attributionConsent' : IDL.Bool,
    'proposals' : IDL.Text,
    'tensions' : IDL.Text,
    'location' : IDL.Text,
    'format' : IDL.Text,
  });
  const CommissionComment = IDL.Record({
    'at' : IDL.Int,
    'body' : IDL.Text,
    'author' : IDL.Text,
  });
  const CommissionSubmission = IDL.Record({
    'id' : IDL.Nat,
    'consultationId' : IDL.Nat,
    'canWithdraw' : IDL.Bool,
    'input' : CommissionInput,
    'comments' : IDL.Vec(CommissionComment),
    'facilitated' : IDL.Bool,
    'withdrawn' : IDL.Bool,
  });
  const CommissionConsultation = IDL.Record({
    'id' : IDL.Nat,
    'closed' : IDL.Bool,
    'closes' : IDL.Int,
    'title' : IDL.Text,
    'opens' : IDL.Int,
    'audience' : IDL.Text,
    'groupId' : IDL.Nat,
    'questions' : IDL.Vec(IDL.Text),
    'guidance' : IDL.Text,
    'purpose' : IDL.Text,
  });
  const CommissionFinding = IDL.Record({
    'id' : IDL.Nat,
    'body' : IDL.Text,
    'kind' : IDL.Text,
    'groupId' : IDL.Nat,
    'sources' : IDL.Vec(IDL.Nat),
    'needsReview' : IDL.Bool,
  });
  const CommissionPublicGroup = IDL.Record({
    'id' : IDL.Nat,
    'name' : IDL.Text,
    'stage' : IDL.Nat,
    'purpose' : IDL.Text,
  });
  const CommissionStageNote = IDL.Record({
    'at' : IDL.Int,
    'id' : IDL.Nat,
    'sharedWithAdvisors' : IDL.Bool,
    'body' : IDL.Text,
    'role' : IDL.Text,
    'author' : IDL.Text,
    'stage' : IDL.Nat,
    'groupId' : IDL.Nat,
  });
  const CommissionParticipant = IDL.Record({
    'principal' : IDL.Principal,
    'name' : IDL.Text,
    'roleId' : IDL.Text,
  });
  const CommissionPublicationMarker = IDL.Record({
    'at' : IDL.Int,
    'id' : IDL.Nat,
    'status' : IDL.Text,
    'groupId' : IDL.Nat,
    'sources' : IDL.Vec(IDL.Nat),
  });
  const CommissionPublication = IDL.Record({
    'at' : IDL.Int,
    'title' : IDL.Text,
    'disagreements' : IDL.Text,
    'body' : IDL.Text,
    'groupId' : IDL.Nat,
    'sources' : IDL.Vec(IDL.Nat),
  });
  const CommissionReviewCopy = IDL.Record({
    'title' : IDL.Text,
    'body' : IDL.Text,
    'consultationId' : IDL.Nat,
    'sources' : IDL.Vec(IDL.Nat),
    'needsReview' : IDL.Bool,
  });
  const CommissionRoleDefinition = IDL.Record({
    'id' : IDL.Text,
    'capabilities' : IDL.Vec(IDL.Text),
    'name' : IDL.Text,
  });
  const CommissionProvenanceLink = IDL.Record({
    'sourceId' : IDL.Nat,
    'groupId' : IDL.Nat,
    'targetKind' : IDL.Text,
    'targetId' : IDL.Nat,
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
    'goalAmount' : IDL.Nat,
    'deadlineNs' : IDL.Int,
    'creatorName' : IDL.Text,
    'mediaUrl' : IDL.Opt(IDL.Text),
    'story' : IDL.Text,
    'shortDescription' : IDL.Text,
    'currency' : IDL.Text,
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
  const RoleChangeProposalInput = IDL.Record({
    'role' : IDL.Opt(CommunityRole),
    'target' : IDL.Principal,
    'reason' : IDL.Text,
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
    'currency' : IDL.Text,
    'updates' : IDL.Vec(CampaignUpdatePayload),
    'fundsUse' : IDL.Text,
    'canContribute' : IDL.Bool,
    'visibility' : CampaignVisibility,
    'archived' : IDL.Bool,
  });
  const ProposalLinkedResource = IDL.Variant({
    'campaign' : IDL.Nat,
    'communityRole' : IDL.Principal,
  });
  const ProposalBody = IDL.Variant({
    'fundraising' : FundraisingCampaignInput,
    'roleChange' : RoleChangeProposalInput,
    'motion' : IDL.Record({ 'description' : IDL.Text }),
  });
  const ProposalExecutionState = IDL.Variant({
    'pending' : IDL.Null,
    'applied' : IDL.Null,
    'notApplicable' : IDL.Null,
    'failed' : IDL.Text,
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
    'linkedResource' : IDL.Opt(ProposalLinkedResource),
    'title' : IDL.Text,
    'creator' : IDL.Principal,
    'communityId' : IDL.Nat,
    'startNs' : IDL.Int,
    'body' : ProposalBody,
    'executionState' : ProposalExecutionState,
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
    'commissionAccess' : IDL.Func([IDL.Nat], [CommissionAccess], ['query']),
    'commissionAddStageNote' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Text, IDL.Bool],
        [IDL.Nat],
        [],
      ),
    'commissionAdvisorStageShared' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Bool],
        ['query'],
      ),
    'commissionAssignConfiguredRole' : IDL.Func(
        [IDL.Nat, IDL.Principal, IDL.Opt(IDL.Text)],
        [],
        [],
      ),
    'commissionAssignRole' : IDL.Func(
        [IDL.Nat, IDL.Principal, IDL.Opt(CommissionRole)],
        [],
        [],
      ),
    'commissionComment' : IDL.Func([IDL.Nat, IDL.Text, IDL.Text], [], []),
    'commissionContributionDetail' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [CommissionContributionDetail],
        ['query'],
      ),
    'commissionContributionTypes' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionContributionType)],
        ['query'],
      ),
    'commissionDisplayName' : IDL.Func([IDL.Nat], [IDL.Text], ['query']),
    'commissionDraftEvidenceState' : IDL.Func(
        [IDL.Nat],
        [CommissionDraftEvidence],
        ['query'],
      ),
    'commissionGetGroup' : IDL.Func([IDL.Nat], [CommissionGroup], ['query']),
    'commissionGetSubmission' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [CommissionSubmission],
        ['query'],
      ),
    'commissionGroupSources' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionSubmission)],
        ['query'],
      ),
    'commissionInitializeSettings' : IDL.Func([IDL.Nat], [], []),
    'commissionListConsultations' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionConsultation)],
        ['query'],
      ),
    'commissionListFindings' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionFinding)],
        ['query'],
      ),
    'commissionListGroups' : IDL.Func(
        [],
        [IDL.Vec(CommissionPublicGroup)],
        ['query'],
      ),
    'commissionListStageNotes' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(CommissionStageNote)],
        ['query'],
      ),
    'commissionListSubmissions' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionSubmission)],
        ['query'],
      ),
    'commissionParticipants' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionParticipant)],
        ['query'],
      ),
    'commissionPublicationStatus' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionPublicationMarker)],
        ['query'],
      ),
    'commissionPublicationsList' : IDL.Func(
        [],
        [IDL.Vec(CommissionPublication)],
        ['query'],
      ),
    'commissionPublish' : IDL.Func([CommissionPublication], [], []),
    'commissionReviewCopy' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(CommissionReviewCopy)],
        ['query'],
      ),
    'commissionRole' : IDL.Func(
        [IDL.Nat],
        [IDL.Opt(CommissionRole)],
        ['query'],
      ),
    'commissionRoles' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionRoleDefinition)],
        ['query'],
      ),
    'commissionSaveConsultation' : IDL.Func(
        [CommissionConsultation, IDL.Bool],
        [IDL.Nat],
        [],
      ),
    'commissionSaveContributionType' : IDL.Func(
        [IDL.Nat, CommissionContributionType, IDL.Bool],
        [IDL.Text],
        [],
      ),
    'commissionSaveDraftEvidence' : IDL.Func(
        [IDL.Nat, IDL.Vec(IDL.Nat), IDL.Bool],
        [],
        [],
      ),
    'commissionSaveFinding' : IDL.Func(
        [CommissionFinding, IDL.Bool],
        [IDL.Nat],
        [],
      ),
    'commissionSaveGroup' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Nat, IDL.Text, IDL.Text, IDL.Bool],
        [],
        [],
      ),
    'commissionSaveGroupDetails' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Nat],
        [],
        [],
      ),
    'commissionSaveRecommendation' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Vec(IDL.Nat), IDL.Bool],
        [],
        [],
      ),
    'commissionSaveReviewCopy' : IDL.Func([CommissionReviewCopy], [], []),
    'commissionSaveRole' : IDL.Func(
        [IDL.Nat, CommissionRoleDefinition, IDL.Bool],
        [IDL.Text],
        [],
      ),
    'commissionSetConsultationStage' : IDL.Func([IDL.Nat, IDL.Nat], [], []),
    'commissionSetDisplayName' : IDL.Func([IDL.Nat, IDL.Text], [], []),
    'commissionSetupDemo' : IDL.Func([], [IDL.Vec(IDL.Nat)], []),
    'commissionShareAdvisorStage' : IDL.Func(
        [IDL.Nat, IDL.Nat, IDL.Bool],
        [],
        [],
      ),
    'commissionSharedDraft' : IDL.Func([IDL.Nat], [IDL.Text], ['query']),
    'commissionSourceProvenance' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommissionProvenanceLink)],
        ['query'],
      ),
    'commissionStageConsultations' : IDL.Func(
        [IDL.Nat, IDL.Nat],
        [IDL.Vec(CommissionConsultation)],
        ['query'],
      ),
    'commissionSubmissionTypes' : IDL.Func(
        [IDL.Nat, IDL.Text],
        [IDL.Vec(CommissionContributionType)],
        ['query'],
      ),
    'commissionSubmit' : IDL.Func(
        [IDL.Nat, CommissionInput, IDL.Text, IDL.Bool],
        [IDL.Nat],
        [],
      ),
    'commissionSubmitFlexible' : IDL.Func(
        [
          IDL.Nat,
          CommissionInput,
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Bool,
          IDL.Bool,
        ],
        [IDL.Nat],
        [],
      ),
    'commissionWithdraw' : IDL.Func([IDL.Nat, IDL.Text], [], []),
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
    'createFundraisingProposal' : IDL.Func(
        [IDL.Nat, FundraisingCampaignInput, IDL.Opt(ProposalOverrides)],
        [IDL.Nat],
        [],
      ),
    'createMotionProposal' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Opt(ProposalOverrides)],
        [IDL.Nat],
        [],
      ),
    'createProposal' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Opt(ProposalOverrides)],
        [],
        [],
      ),
    'createRoleChangeProposal' : IDL.Func(
        [
          IDL.Nat,
          IDL.Text,
          RoleChangeProposalInput,
          IDL.Opt(ProposalOverrides),
        ],
        [IDL.Nat],
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
