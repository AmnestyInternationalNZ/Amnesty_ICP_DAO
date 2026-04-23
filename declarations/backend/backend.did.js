export const idlFactory = ({ IDL }) => {
  const UserRole = IDL.Variant({
    'admin' : IDL.Null,
    'user' : IDL.Null,
    'guest' : IDL.Null,
  });
  const ProposalOverrides = IDL.Record({
    'passPct' : IDL.Opt(IDL.Nat),
    'windowNs' : IDL.Opt(IDL.Nat),
    'quorum' : IDL.Opt(IDL.Nat),
  });
  const Community = IDL.Record({
    'id' : IDL.Nat,
    'members' : IDL.Vec(IDL.Principal),
    'admin' : IDL.Principal,
    'name' : IDL.Text,
    'policy' : IDL.Text,
  });
  const UserProfile = IDL.Record({ 'name' : IDL.Text });
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
  return IDL.Service({
    'assignCallerUserRole' : IDL.Func([IDL.Principal, UserRole], [], []),
    'createCommunity' : IDL.Func([IDL.Text, IDL.Text], [], []),
    'createProposal' : IDL.Func(
        [IDL.Nat, IDL.Text, IDL.Text, IDL.Opt(ProposalOverrides)],
        [],
        [],
      ),
    'enterCommunityPortal' : IDL.Func([IDL.Nat], [Community], ['query']),
    'finalizeProposal' : IDL.Func([IDL.Nat], [], []),
    'getCallerUserProfile' : IDL.Func([], [IDL.Opt(UserProfile)], ['query']),
    'getCallerUserRole' : IDL.Func([], [UserRole], ['query']),
    'getCommunityById' : IDL.Func([IDL.Nat], [IDL.Opt(Community)], ['query']),
    'getProposalById' : IDL.Func([IDL.Nat], [IDL.Opt(Proposal)], ['query']),
    'getUserProfile' : IDL.Func(
        [IDL.Principal],
        [IDL.Opt(UserProfile)],
        ['query'],
      ),
    'initializeAccessControl' : IDL.Func([], [], []),
    'isCallerAdmin' : IDL.Func([], [IDL.Bool], ['query']),
    'joinCommunity' : IDL.Func([IDL.Nat], [], []),
    'leaveCommunity' : IDL.Func([IDL.Nat], [], []),
    'listAllUsers' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Principal, UserProfile))],
        ['query'],
      ),
    'listCommunities' : IDL.Func([], [IDL.Vec(Community)], ['query']),
    'listProposalsByCommunity' : IDL.Func(
        [IDL.Nat],
        [IDL.Vec(Proposal)],
        ['query'],
      ),
    'removeMemberFromCommunity' : IDL.Func([IDL.Nat, IDL.Principal], [], []),
    'saveCallerUserProfile' : IDL.Func([UserProfile], [], []),
    'voteOnProposal' : IDL.Func([IDL.Nat, IDL.Bool], [], []),
  });
};
export const init = ({ IDL }) => { return []; };
