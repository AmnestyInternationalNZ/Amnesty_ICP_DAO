import React, { useEffect, useMemo, useState } from 'react';
import { Principal } from '@dfinity/principal';
import { useTranslation } from 'react-i18next';
import { CommunityMember, CommunityRole } from '../backend';
import { formatNumber } from '../i18n/format';
import { useLocalePreference } from '../i18n/preferences';
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

function assignmentLabel(value: AssignmentValue, t: (key: string) => string) {
  switch (value) {
    case 'platformAdmin':
      return t('common.roles.platformAdmin');
    case CommunityRole.communityAdmin:
      return t('common.roles.communityAdmin');
    case CommunityRole.member:
      return t('common.roles.member');
    default:
      return t('common.roles.viewer');
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

function roleText(role: CommunityRole, t: (key: string) => string) {
  return role === CommunityRole.communityAdmin ? t('common.roles.communityAdmin') : t('common.roles.member');
}

function RosterRow({ member }: { member: CommunityMember }) {
  const { t } = useTranslation();

  return (
    <div className="border border-amnesty-line bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-2xl text-amnesty-ink amnesty-heading">
            {member.profile?.name || t('communities.membership.unnamedMember')}
          </p>
          <p className="mt-2 break-all font-mono text-xs text-[#6c8089]">
            {member.principal.toString()}
          </p>
        </div>
        <span className={`px-3 py-2 text-sm amnesty-heading ${roleBadge(member.role)}`}>
          {roleText(member.role, t)}
        </span>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
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
    { value: 'viewer', label: t('admin.roles.viewerOnly') },
    { value: 'platformAdmin', label: t('common.roles.platformAdmin') }
  ];

  const communityAssignmentOptions: Array<{ value: AssignmentValue; label: string }> = [
    { value: 'viewer', label: t('admin.roles.viewerOnly') },
    { value: CommunityRole.member, label: t('common.roles.member') },
    { value: CommunityRole.communityAdmin, label: t('common.roles.communityAdmin') }
  ];

  const visibleRoster = selectedMembers.slice(0, 6);

  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div>
          <p className="amnesty-kicker text-amnesty-pink mb-4">{t('admin.heroKicker')}</p>
          <h2 className="max-w-4xl text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
            {t('admin.heroTitle')}
          </h2>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#38505d]">
            {t('admin.heroBody')}
          </p>
        </div>

        <div className="amnesty-dark-band px-7 py-7">
          <p className="amnesty-kicker text-amnesty-yellow mb-4">{t('admin.focusKicker')}</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/60">{t('admin.platformAdminsCount')}</p>
              <p className="mt-2 text-4xl text-white amnesty-heading">{formatNumber(platformAdmins?.length ?? 0, locale)}</p>
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-white/60">{t('admin.workingScope')}</p>
              <p className="mt-2 text-4xl text-white amnesty-heading">
                {isPlatformScope ? t('app.nav.platform') : selectedCommunity?.name || t('admin.selectedScopeFallback')}
              </p>
            </div>
          </div>
          <p className="mt-6 text-base leading-7 text-white/78">
            {t('admin.focusBody')}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="amnesty-panel bg-white p-7">
          <div className="mb-6">
            <p className="amnesty-kicker text-amnesty-blue mb-3">{t('admin.stewardsKicker')}</p>
            <h3 className="text-4xl text-amnesty-ink amnesty-heading">{t('admin.stewardsTitle')}</h3>
          </div>

          {platformAdminsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="medium" />
            </div>
          ) : !platformAdmins || platformAdmins.length === 0 ? (
            <div className="border border-amnesty-line bg-[#f4f7f8] px-5 py-8">
              <p className="text-lg leading-8 text-[#38505d]">
                {t('admin.noPlatformAdmins')}
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
                          {profile?.name || t('communities.membership.unnamedMember')}
                        </p>
                        <p className="mt-2 break-all font-mono text-xs text-[#6c8089]">
                          {principal.toString()}
                        </p>
                      </div>
                      <span className="bg-amnesty-ink px-3 py-2 text-sm text-white amnesty-heading">
                        {t('common.roles.platformAdmin')}
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
              <p className="amnesty-kicker text-amnesty-green mb-3">{t('admin.rosterKicker')}</p>
              <h3 className="text-4xl text-amnesty-ink amnesty-heading">
                {selectedCommunity ? selectedCommunity.name : t('admin.chooseScopeTitle')}
              </h3>
            </div>

            <div className="min-w-[18rem]">
              <label htmlFor="admin-scope" className="mb-2 block text-sm text-[#38505d] amnesty-heading">
                {t('admin.scopeLabel')}
              </label>
              <select
                id="admin-scope"
                value={selectedScope}
                onChange={(event) => setSelectedScope(event.target.value as ScopeValue)}
                className="input-field text-lg"
              >
                <option value="platform">{t('app.nav.platform')}</option>
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
                {t('admin.rosterPrompt')}
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
                  <p className="amnesty-kicker text-amnesty-green mb-2">{t('communities.membership.communityAdmins')}</p>
                  <p className="text-4xl text-amnesty-ink amnesty-heading">{formatNumber(selectedCommunityAdmins.length, locale)}</p>
                </div>
                <div className="border border-amnesty-line bg-[#f4f7f8] px-5 py-5">
                  <p className="amnesty-kicker text-amnesty-blue mb-2">{t('communities.membership.members')}</p>
                  <p className="text-4xl text-amnesty-ink amnesty-heading">{formatNumber(selectedRegularMembers.length, locale)}</p>
                </div>
              </div>

              {visibleRoster.length === 0 ? (
                <div className="border border-amnesty-line bg-white px-5 py-8">
                  <p className="text-lg leading-8 text-[#38505d]">
                    {t('admin.rosterNobody')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleRoster.map((member) => (
                    <RosterRow key={member.principal.toString()} member={member} />
                  ))}
                  {selectedMembers.length > visibleRoster.length && (
                    <p className="text-sm leading-6 text-[#6c8089]">
                      {t('admin.rosterShowing', {
                        visible: formatNumber(visibleRoster.length, locale),
                        total: formatNumber(selectedMembers.length, locale)
                      })}
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
                <p className="amnesty-kicker text-amnesty-purple mb-3">{t('admin.userSelectionKicker')}</p>
                <h3 className="text-4xl text-amnesty-ink amnesty-heading">{t('admin.userSelectionTitle')}</h3>
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
                  {t('common.actions.selectFromList')}
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
                  {t('common.actions.enterPrincipal')}
                </button>
              </div>
            </div>

            {selectionMode === 'list' ? (
              !allUsers || allUsers.length === 0 ? (
                <div className="border border-amnesty-line bg-[#f4f7f8] px-5 py-8">
                  <p className="text-lg leading-8 text-[#38505d]">{t('common.empty.noUsers')}</p>
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
                              {profile?.name || t('communities.membership.unnamedMember')}
                            </p>
                            <p className="mt-2 break-all font-mono text-xs text-[#6c8089]">
                              {principal.toString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {isAdmin && (
                              <span className="bg-amnesty-ink px-3 py-2 text-sm text-white amnesty-heading">
                                {t('common.roles.platformAdmin')}
                              </span>
                            )}
                            {communityRole && !isPlatformScope && (
                              <span className={`px-3 py-2 text-sm amnesty-heading ${roleBadge(communityRole)}`}>
                                {roleText(communityRole, t)}
                              </span>
                            )}
                            {!isAdmin && !communityRole && (
                              <span className="bg-[#eef3f5] px-3 py-2 text-sm text-amnesty-ink amnesty-heading">
                                {t('common.roles.viewer')}
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
                    {t('admin.principalLabel')}
                  </label>
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <input
                      type="text"
                      id="principal"
                      value={principalText}
                      onChange={(event) => handleManualUserInput(event.target.value)}
                      className="input-field flex-1 text-lg font-mono"
                      placeholder={t('admin.principalPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={handleLookupUser}
                      disabled={!selectedUser || getUserProfile.isPending}
                      className="btn-secondary lg:min-w-[10rem]"
                    >
                      {getUserProfile.isPending ? <LoadingSpinner size="small" /> : t('common.actions.lookUp')}
                    </button>
                  </div>
                </div>

                <p className="text-sm leading-6 text-[#6c8089]">
                  {t('admin.principalHelp')}
                </p>
              </div>
            )}
          </section>

          {selectedUser && (
            <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="amnesty-panel bg-white p-7">
                <p className="amnesty-kicker text-amnesty-blue mb-3">{t('admin.selectedUserKicker')}</p>
                <h3 className="text-4xl text-amnesty-ink amnesty-heading">
                  {selectedUserName || t('communities.membership.unnamedMember')}
                </h3>
                <p className="mt-4 break-all font-mono text-sm leading-7 text-[#6c8089]">
                  {selectedUser.toString()}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <span className={`px-3 py-2 text-sm amnesty-heading ${assignmentTone(currentScopeAssignment)}`}>
                    {t('admin.currentInScope', { assignment: assignmentLabel(currentScopeAssignment, t) })}
                  </span>
                  <span className="border border-amnesty-line px-3 py-2 text-sm text-amnesty-ink amnesty-heading">
                    {t('common.labels.scope', {
                      scope: isPlatformScope ? t('app.nav.platform') : selectedCommunity?.name || t('admin.selectedScopeFallback')
                    })}
                  </span>
                </div>

                <div className="mt-8 border border-amnesty-line bg-[#f8fbf4] px-5 py-5">
                  <p className="amnesty-kicker text-amnesty-green mb-3">{t('admin.whatChangesKicker')}</p>
                  <p className="text-base leading-7 text-[#38505d]">
                    {isPlatformScope
                      ? t('admin.whatChangesPlatform')
                      : t('admin.whatChangesCommunity')}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="amnesty-panel bg-white p-7 space-y-6">
                <div>
                  <p className="amnesty-kicker text-amnesty-pink mb-3">{t('admin.assignmentKicker')}</p>
                  <h3 className="text-4xl text-amnesty-ink amnesty-heading">
                    {t('admin.assignmentTitle')}
                  </h3>
                </div>

                <div>
                  <label htmlFor="assignment" className="mb-3 block text-lg text-amnesty-ink amnesty-heading">
                    {t('admin.assignmentLabel')}
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
                  <p className="amnesty-kicker text-amnesty-ink mb-3">{t('admin.assignmentEffectTitle')}</p>
                  <p className="text-base leading-7 text-amnesty-ink">
                    {isPlatformScope
                      ? selectedAssignment === 'platformAdmin'
                        ? t('admin.assignmentEffects.platformAdmin')
                        : t('admin.assignmentEffects.removePlatformAdmin')
                      : selectedAssignment === 'viewer'
                        ? t('admin.assignmentEffects.viewer')
                        : selectedAssignment === CommunityRole.communityAdmin
                          ? t('admin.assignmentEffects.communityAdmin')
                          : t('admin.assignmentEffects.member')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={setPlatformAdmin.isPending || setCommunityRole.isPending}
                    className="btn-primary rounded-full"
                  >
                    {setPlatformAdmin.isPending || setCommunityRole.isPending
                      ? t('common.loading.saving')
                      : t('common.actions.saveAssignment')}
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
