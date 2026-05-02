import React from 'react';
import { CommunityMember, CommunityRole } from '../backend';
import { useListCommunityMembers } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

interface CommunityMembersListProps {
  communityId: bigint;
}

function roleColor(role: CommunityRole) {
  return role === CommunityRole.communityAdmin
    ? 'bg-amnesty-ink text-white'
    : 'bg-[#eef3f5] text-amnesty-ink';
}

function roleLabel(role: CommunityRole) {
  return role === CommunityRole.communityAdmin ? 'COMMUNITY ADMIN' : 'MEMBER';
}

function renderMemberList(
  title: string,
  members: Array<CommunityMember>,
  emptyMessage: string
) {
  return (
    <div className="mb-8">
      <h4 className="text-3xl text-amnesty-ink mb-4 amnesty-heading">{title}</h4>
      {members.length === 0 ? (
        <div className="border border-amnesty-line bg-[#f4f7f8] px-6 py-8 text-center">
          <p className="text-lg text-[#38505d]">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.principal.toString()}
              className="border border-amnesty-line bg-white p-5 transition-colors hover:bg-[#f9fbfb]"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h5 className="text-2xl text-amnesty-ink amnesty-heading">
                      {member.profile?.name || 'Unnamed member'}
                    </h5>
                    <span className={`px-3 py-1 text-sm font-bold amnesty-heading ${roleColor(member.role)}`}>
                      {roleLabel(member.role)}
                    </span>
                  </div>
                  <div className="border border-amnesty-line bg-[#f4f7f8] p-3">
                    <p className="text-xs text-amnesty-ink font-mono break-all">
                      <span className="font-bold amnesty-heading">Principal</span>
                    </p>
                    <p className="text-xs text-amnesty-ink font-mono break-all mt-1">{member.principal.toString()}</p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center bg-amnesty-yellow">
                    <svg className="w-5 h-5 text-amnesty-ink" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommunityMembersList({ communityId }: CommunityMembersListProps) {
  const { data: members, isLoading, error } = useListCommunityMembers(communityId);

  if (isLoading) {
    return (
      <div id="membership" className="amnesty-panel bg-white p-8">
        <h3 className="text-4xl text-amnesty-ink mb-6 amnesty-heading">Community membership</h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="medium" />
        </div>
      </div>
    );
  }

  if (error || !members) {
    return (
      <div id="membership" className="amnesty-panel bg-white p-8">
        <h3 className="text-4xl text-amnesty-ink mb-6 amnesty-heading">Community membership</h3>
        <div className="text-center py-8">
          <p className="text-lg text-[#38505d]">Unable to load community membership information.</p>
        </div>
      </div>
    );
  }

  const communityAdmins = members.filter((member) => member.role === CommunityRole.communityAdmin);
  const communityMembers = members.filter((member) => member.role === CommunityRole.member);

  return (
    <section id="membership" className="amnesty-panel bg-white p-8 md:p-10">
      <div className="mb-8">
        <p className="amnesty-kicker text-amnesty-blue mb-4">Role model</p>
        <h3 className="text-5xl text-amnesty-ink amnesty-heading">Community membership</h3>
        <p className="text-lg text-[#38505d] mt-4 leading-8">
          Role-based membership assignments for this community.
        </p>
      </div>

      <div className="mb-8 bg-amnesty-yellow px-5 py-5">
        <div className="flex">
          <svg className="w-6 h-6 text-amnesty-ink mt-1 mr-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <div>
            <h4 className="text-lg font-bold text-amnesty-ink mb-1 amnesty-heading">Viewer access stays implicit</h4>
            <p className="text-amnesty-ink">
              Viewers are implicit and are not listed here. This roster shows only the principals with an assigned community role: community admins and members.
            </p>
          </div>
        </div>
      </div>

      {renderMemberList('COMMUNITY ADMINS', communityAdmins, 'No community admins assigned.')}
      {renderMemberList('MEMBERS', communityMembers, 'No members assigned to this community.')}
    </section>
  );
}
