import React, { useEffect, useMemo, useState } from 'react';
import { Principal } from '@dfinity/principal';
import { CommunityMember, CommunityRole } from '../backend';
import {
  useGetUserProfile,
  useListAllUsers,
  useListCommunities,
  useListCommunityMembers,
  useListPlatformAdmins,
  useSetCommunityRole,
  useSetPlatformAdmin
} from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

type SelectionMode = 'list' | 'manual';
type ScopeValue = 'platform' | string;
type AssignmentValue = 'viewer' | 'platformAdmin' | CommunityRole;

function assignmentLabel(value: AssignmentValue) {
  switch (value) {
    case 'platformAdmin':
      return 'Platform admin';
    case CommunityRole.communityAdmin:
      return 'Community admin';
    case CommunityRole.member:
      return 'Member';
    default:
      return 'Viewer';
  }
}

function assignmentTone(value: AssignmentValue) {
  switch (value) {
    case 'platformAdmin':
      return 'bg-amnesty-ink text-white';
    case CommunityRole.communityAdmin:
      return 'bg-amnesty-pink text-white';
    case CommunityRole.member:
      return 'bg-[#eff7e7] text-amnesty-ink';
    default:
      return 'bg-[#eef3f5] text-amnesty-ink';
  }
}

function roleBadge(role: CommunityRole) {
  return role === CommunityRole.communityAdmin
    ? 'bg-amnesty-pink text-white'
    : 'bg-[#eff7e7] text-amnesty-ink';
}

function roleText(role: CommunityRole) {
  return role === CommunityRole.communityAdmin ? 'Community admin' : 'Member';
}

function RosterRow({ member }: { member: CommunityMember }) {
  return (
    <div className="border border-amnesty-line bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-2xl text-amnesty-ink amnesty-heading">
            {member.profile?.name || 'Unnamed member'}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-[#6c8089]">
            {member.principal.toString()}
          </p>
        </div>
        <span className={`px-3 py-2 text-sm amnesty-heading ${roleBadge(member.role)}`}>
          {roleText(member.role)}
        </span>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [selectedUser, setSelectedUser] = useState<Principal | null>(null);
  const [principalText, setPrincipalText] = useState('');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('list');
  const [selectedScope, setSelectedScope] = useState<ScopeValue>('platform');
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentValue>('viewer');

  const setPlatformAdmin = useSetPlatformAdmin();
  const setCommunityRole = useSetCommunityRole();
  const getUserProfile = useGetUserProfile();
  const { data: communities, isLoading: communitiesLoading } = useListCommunities();
  const { data: allUsers, isLoading: usersLoading } = useListAllUsers();
  const { data: platformAdmins, isLoading: platformAdminsLoading } = useListPlatformAdmins();

  const selectedCommunityId = selectedScope === 'platform' ? null : BigInt(selectedScope);
  const { data: selectedCommunityMembers, isLoading: selectedCommunityMembersLoading } = useListCommunityMembers(selectedCommunityId);

  const selectedCommunity = useMemo(
    () => communities?.find((community) => community.id.toString() === selectedScope),
    [communities, selectedScope]
  );

  const isPlatformScope = selectedScope === 'platform';
  const isLoading = communitiesLoading || usersLoading || platformAdminsLoading;
  const selectedMembers = selectedCommunityId === null ? [] : selectedCommunityMembers ?? [];
  const selectedCommunityAdmins = selectedMembers.filter((member) => member.role === CommunityRole.communityAdmin);
  const selectedRegularMembers = selectedMembers.filter((member) => member.role === CommunityRole.member);
  const platformAdminSet = useMemo(
    () => new Set((platformAdmins ?? []).map((principal) => principal.toString())),
    [platformAdmins]
  );

  useEffect(() => {
    if (!selectedUser) return;

    if (isPlatformScope) {
      setSelectedAssignment(platformAdminSet.has(selectedUser.toString()) ? 'platformAdmin' : 'viewer');
      return;
    }

    const existingRole =
      selectedMembers.find((member) => member.principal.toString() === selectedUser.toString())?.role ?? null;
    setSelectedAssignment(existingRole ?? 'viewer');
  }, [isPlatformScope, platformAdminSet, selectedMembers, selectedUser]);

  const handleUserSelection = (user: Principal) => {
    setSelectedUser(user);
    setPrincipalText(user.toString());
  };

  const handleManualUserInput = (value: string) => {
    setPrincipalText(value);
    try {
      setSelectedUser(Principal.fromText(value.trim()));
    } catch {
      setSelectedUser(null);
    }
  };

  const handleLookupUser = async () => {
    if (!selectedUser) return;
    try {
      await getUserProfile.mutateAsync(selectedUser);
    } catch (error) {
      console.error('Failed to lookup user profile:', error);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUser) return;

    try {
      if (isPlatformScope) {
        await setPlatformAdmin.mutateAsync({
          user: selectedUser,
          enabled: selectedAssignment === 'platformAdmin'
        });
      } else if (selectedCommunityId !== null) {
        await setCommunityRole.mutateAsync({
          communityId: selectedCommunityId,
          user: selectedUser,
          role: selectedAssignment === 'viewer' ? null : (selectedAssignment as CommunityRole)
        });
      }

      setSelectedUser(null);
      setPrincipalText('');
      setSelectedAssignment('viewer');
    } catch (error) {
      console.error('Failed to save role assignment:', error);
    }
  };

  const selectedUserName = useMemo(() => {
    if (!selectedUser || !allUsers) return null;
    return allUsers.find(([principal]) => principal.toString() === selectedUser.toString())?.[1]?.name ?? null;
  }, [allUsers, selectedUser]);

  const currentScopeAssignment = useMemo<AssignmentValue>(() => {
    if (!selectedUser) return 'viewer';
    if (isPlatformScope) {
      return platformAdminSet.has(selectedUser.toString()) ? 'platformAdmin' : 'viewer';
    }

    return (
      selectedMembers.find((member) => member.principal.toString() === selectedUser.toString())?.role ?? 'viewer'
    );
  }, [isPlatformScope, platformAdminSet, selectedMembers, selectedUser]);

  const platformAssignmentOptions: Array<{ value: AssignmentValue; label: string }> = [
    { value: 'viewer', label: 'Viewer only' },
    { value: 'platformAdmin', label: 'Platform admin' }
  ];

  const communityAssignmentOptions: Array<{ value: AssignmentValue; label: string }> = [
    { value: 'viewer', label: 'Viewer only' },
    { value: CommunityRole.member, label: 'Member' },
    { value: CommunityRole.communityAdmin, label: 'Community admin' }
  ];

  const visibleRoster = selectedMembers.slice(0, 6);

  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div>
          <p className="amnesty-kicker text-amnesty-pink mb-4">Platform stewardship</p>
          <h2 className="max-w-4xl text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
            Assign platform admins and community roles from one place.
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#38505d]">
            Review who holds platform-wide access, inspect local rosters, and shift people
            between viewer, member, and community admin roles without leaving this space.
          </p>
        </div>

        <div className="amnesty-dark-band px-7 py-7">
          <p className="amnesty-kicker text-amnesty-yellow mb-4">Current focus</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/60">Platform admins</p>
              <p className="mt-2 text-4xl text-white amnesty-heading">{platformAdmins?.length ?? 0}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/60">Working scope</p>
              <p className="mt-2 text-4xl text-white amnesty-heading">
                {isPlatformScope ? 'Platform' : selectedCommunity?.name || 'Community'}
              </p>
            </div>
          </div>
          <p className="mt-6 text-base leading-7 text-white/78">
            Platform admins can manage any community. Community roles stay local to the
            selected community space.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="amnesty-panel bg-white p-7">
          <div className="mb-6">
            <p className="amnesty-kicker text-amnesty-blue mb-3">Platform admins</p>
            <h3 className="text-4xl text-amnesty-ink amnesty-heading">Current stewards</h3>
          </div>

          {platformAdminsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="medium" />
            </div>
          ) : !platformAdmins || platformAdmins.length === 0 ? (
            <div className="border border-amnesty-line bg-[#f4f7f8] px-5 py-8">
              <p className="text-lg leading-8 text-[#38505d]">
                No platform admins are currently assigned.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {platformAdmins.map((principal) => {
                const profile = allUsers?.find(([userPrincipal]) => userPrincipal.toString() === principal.toString())?.[1];
                return (
                  <div key={principal.toString()} className="border border-amnesty-line bg-white px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-2xl text-amnesty-ink amnesty-heading">
                          {profile?.name || 'Unnamed user'}
                        </p>
                        <p className="mt-2 break-all font-mono text-xs text-[#6c8089]">
                          {principal.toString()}
                        </p>
                      </div>
                      <span className="bg-amnesty-ink px-3 py-2 text-sm text-white amnesty-heading">
                        Platform admin
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="amnesty-panel bg-white p-7">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="amnesty-kicker text-amnesty-green mb-3">Community roster</p>
              <h3 className="text-4xl text-amnesty-ink amnesty-heading">
                {selectedCommunity ? selectedCommunity.name : 'Choose a working scope'}
              </h3>
            </div>

            <div className="min-w-[18rem]">
              <label htmlFor="admin-scope" className="mb-2 block text-sm text-[#38505d] amnesty-heading">
                Working scope
              </label>
              <select
                id="admin-scope"
                value={selectedScope}
                onChange={(event) => setSelectedScope(event.target.value as ScopeValue)}
                className="input-field text-lg"
              >
                <option value="platform">Platform</option>
                {communities?.map((community) => (
                  <option key={community.id.toString()} value={community.id.toString()}>
                    {community.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCommunityId === null ? (
            <div className="border border-amnesty-line bg-[#f4f7f8] px-5 py-8">
              <p className="text-lg leading-8 text-[#38505d]">
                Choose a community scope to inspect its current role assignments. Viewer
                access remains implicit and is never listed in the roster.
              </p>
            </div>
          ) : selectedCommunityMembersLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="medium" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-amnesty-line bg-[#f8fbf4] px-5 py-5">
                  <p className="amnesty-kicker text-amnesty-green mb-2">Community admins</p>
                  <p className="text-4xl text-amnesty-ink amnesty-heading">{selectedCommunityAdmins.length}</p>
                </div>
                <div className="border border-amnesty-line bg-[#f4f7f8] px-5 py-5">
                  <p className="amnesty-kicker text-amnesty-blue mb-2">Members</p>
                  <p className="text-4xl text-amnesty-ink amnesty-heading">{selectedRegularMembers.length}</p>
                </div>
              </div>

              {visibleRoster.length === 0 ? (
                <div className="border border-amnesty-line bg-white px-5 py-8">
                  <p className="text-lg leading-8 text-[#38505d]">
                    Nobody has an assigned role in this community yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleRoster.map((member) => (
                    <RosterRow key={member.principal.toString()} member={member} />
                  ))}
                  {selectedMembers.length > visibleRoster.length && (
                    <p className="text-sm leading-6 text-[#6c8089]">
                      Showing {visibleRoster.length} of {selectedMembers.length} assigned
                      people in this community.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="large" />
        </div>
      ) : (
        <>
          <section className="amnesty-panel bg-white p-8">
            <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="amnesty-kicker text-amnesty-purple mb-3">User selection</p>
                <h3 className="text-4xl text-amnesty-ink amnesty-heading">Choose who to update</h3>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSelectionMode('list')}
                  className={
                    selectionMode === 'list'
                      ? 'btn-primary rounded-full'
                      : 'btn-secondary rounded-full'
                  }
                >
                  Select from list
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode('manual')}
                  className={
                    selectionMode === 'manual'
                      ? 'btn-primary rounded-full'
                      : 'btn-secondary rounded-full'
                  }
                >
                  Enter principal
                </button>
              </div>
            </div>

            {selectionMode === 'list' ? (
              !allUsers || allUsers.length === 0 ? (
                <div className="border border-amnesty-line bg-[#f4f7f8] px-5 py-8">
                  <p className="text-lg leading-8 text-[#38505d]">No saved user profiles yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allUsers.map(([principal, profile]) => {
                    const isSelected = selectedUser?.toString() === principal.toString();
                    const isAdmin = platformAdminSet.has(principal.toString());
                    const communityRole =
                      selectedMembers.find((member) => member.principal.toString() === principal.toString())?.role ?? null;

                    return (
                      <button
                        key={principal.toString()}
                        type="button"
                        onClick={() => handleUserSelection(principal)}
                        className={`w-full border px-5 py-4 text-left transition-colors ${
                          isSelected
                            ? 'border-amnesty-yellow bg-[#fffde0]'
                            : 'border-amnesty-line bg-white hover:bg-[#f8fbfb]'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-2xl text-amnesty-ink amnesty-heading">
                              {profile?.name || 'Unnamed user'}
                            </p>
                            <p className="mt-2 break-all font-mono text-xs text-[#6c8089]">
                              {principal.toString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isAdmin && (
                              <span className="bg-amnesty-ink px-3 py-2 text-sm text-white amnesty-heading">
                                Platform admin
                              </span>
                            )}
                            {communityRole && !isPlatformScope && (
                              <span className={`px-3 py-2 text-sm amnesty-heading ${roleBadge(communityRole)}`}>
                                {roleText(communityRole)}
                              </span>
                            )}
                            {!isAdmin && !communityRole && (
                              <span className="bg-[#eef3f5] px-3 py-2 text-sm text-amnesty-ink amnesty-heading">
                                Viewer
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="space-y-5">
                <div>
                  <label htmlFor="principal" className="mb-3 block text-lg text-amnesty-ink amnesty-heading">
                    User principal ID
                  </label>
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <input
                      type="text"
                      id="principal"
                      value={principalText}
                      onChange={(event) => handleManualUserInput(event.target.value)}
                      className="input-field flex-1 text-lg font-mono"
                      placeholder="Enter a principal ID"
                    />
                    <button
                      type="button"
                      onClick={handleLookupUser}
                      disabled={!selectedUser || getUserProfile.isPending}
                      className="btn-secondary lg:min-w-[10rem]"
                    >
                      {getUserProfile.isPending ? <LoadingSpinner size="small" /> : 'Look up'}
                    </button>
                  </div>
                </div>

                <p className="text-sm leading-6 text-[#6c8089]">
                  Enter a valid principal to manage a user who does not yet appear in the
                  saved profile list.
                </p>
              </div>
            )}
          </section>

          {selectedUser && (
            <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="amnesty-panel bg-white p-7">
                <p className="amnesty-kicker text-amnesty-blue mb-3">Selected user</p>
                <h3 className="text-4xl text-amnesty-ink amnesty-heading">
                  {selectedUserName || 'Unnamed user'}
                </h3>
                <p className="mt-4 break-all font-mono text-sm leading-7 text-[#6c8089]">
                  {selectedUser.toString()}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className={`px-3 py-2 text-sm amnesty-heading ${assignmentTone(currentScopeAssignment)}`}>
                    Current in scope: {assignmentLabel(currentScopeAssignment)}
                  </span>
                  <span className="border border-amnesty-line px-3 py-2 text-sm text-amnesty-ink amnesty-heading">
                    Scope: {isPlatformScope ? 'Platform' : selectedCommunity?.name || 'Community'}
                  </span>
                </div>

                <div className="mt-8 border border-amnesty-line bg-[#f8fbf4] px-5 py-5">
                  <p className="amnesty-kicker text-amnesty-green mb-3">What changes here</p>
                  <p className="text-base leading-7 text-[#38505d]">
                    {isPlatformScope
                      ? 'Platform admin changes affect platform-wide stewardship only. Any community-specific roles remain intact.'
                      : 'Community role changes affect only the selected community. Platform admin access, if any, remains unchanged.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="amnesty-panel bg-white p-7 space-y-6">
                <div>
                  <p className="amnesty-kicker text-amnesty-pink mb-3">Assignment</p>
                  <h3 className="text-4xl text-amnesty-ink amnesty-heading">
                    Update access for this scope
                  </h3>
                </div>

                <div>
                  <label htmlFor="assignment" className="mb-3 block text-lg text-amnesty-ink amnesty-heading">
                    Assignment
                  </label>
                  <select
                    id="assignment"
                    value={selectedAssignment}
                    onChange={(event) => setSelectedAssignment(event.target.value as AssignmentValue)}
                    className="input-field text-lg"
                  >
                    {(isPlatformScope ? platformAssignmentOptions : communityAssignmentOptions).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-amnesty-yellow px-5 py-5">
                  <p className="amnesty-kicker text-amnesty-ink mb-3">What this does</p>
                  <p className="text-base leading-7 text-amnesty-ink">
                    {isPlatformScope
                      ? selectedAssignment === 'platformAdmin'
                        ? 'Grant platform-wide admin privileges. This person will be able to create communities and manage membership across the platform.'
                        : 'Remove platform-wide admin privileges while leaving community-scoped assignments untouched.'
                      : selectedAssignment === 'viewer'
                        ? 'Remove any assigned community role. The person will still be able to read the community as an authenticated viewer.'
                        : selectedAssignment === CommunityRole.communityAdmin
                          ? 'Assign community admin privileges for the selected community.'
                          : 'Assign member participation for the selected community.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={setPlatformAdmin.isPending || setCommunityRole.isPending}
                    className="btn-primary rounded-full"
                  >
                    {setPlatformAdmin.isPending || setCommunityRole.isPending
                      ? 'Saving...'
                      : 'Save assignment'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
    </div>
  );
}
