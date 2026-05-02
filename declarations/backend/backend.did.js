export const idlFactory = ({ IDL }) => {
  const ShoppingItem = IDL.Record({
    'productName' : IDL.Text,
    'currency' : IDL.Text,
    'quantity' : IDL.Nat,
    'priceInCents' : IDL.Nat,
    'productDescription' : IDL.Text,
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
  const Community = IDL.Record({
    'id' : IDL.Nat,
    'members' : IDL.Vec(IDL.Principal),
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'policy' : IDL.Text,
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
    'bootstrapPlatformAdmin' : IDL.Func([], [], []),
    'canFinalizeCampaign' : IDL.Func([IDL.Nat], [IDL.Bool], ['query']),
    'contributeToCampaign' : IDL.Func([IDL.Nat, IDL.Nat], [], []),
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
    'createProposal' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Opt(ProposalOverrides)],
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
    'getCommunityById' : IDL.Func([IDL.Nat], [IDL.Opt(Community)], ['query']),
    'getProposalById' : IDL.Func([IDL.Nat], [IDL.Opt(Proposal)], ['query']),
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
    'listCommunityMembers' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(CommunityMember)],
        ['query'],
      ),
    'listPlatformAdmins' : IDL.Func([], [IDL.Vec(IDL.Principal)], ['query']),
    'listProposalsByCommunity' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(Proposal)],
        ['query'],
      ),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
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
    'voteOnProposal' : IDL.Func([IDL.Nat, IDL.Bool], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
