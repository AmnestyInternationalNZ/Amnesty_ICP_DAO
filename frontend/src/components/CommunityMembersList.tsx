import React from 'react';
import { useGetCommunityById, useListAllUsers, useGetCallerUserRole } from '../hooks/useQueries';
import { Principal } from '@dfinity/principal';
import { UserProfile, UserRole } from '../backend';
import LoadingSpinner from './LoadingSpinner';

interface CommunityMembersListProps {
  communityId: bigint;
}

export default function CommunityMembersList({ communityId }: CommunityMembersListProps) {
  const { data: community, isLoading: communityLoading, error: communityError } = useGetCommunityById(communityId);
  const { data: allUsers, isLoading: usersLoading } = useListAllUsers();
  const { data: userRole } = useGetCallerUserRole();

  if (communityLoading || usersLoading) {
    return (
      <div className="bg-white border-4 border-black p-8 shadow-amnesty">
        <h3 className="text-2xl font-bold text-black mb-6 amnesty-heading">COMMUNITY GOVERNANCE</h3>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="medium" />
        </div>
      </div>
    );
  }

  if (communityError || !community || !allUsers) {
    return (
      <div className="bg-white border-4 border-black p-8 shadow-amnesty">
        <h3 className="text-2xl font-bold text-black mb-6 amnesty-heading">COMMUNITY GOVERNANCE</h3>
        <div className="text-center py-8">
          <p className="text-lg text-black">Unable to load community governance information.</p>
        </div>
      </div>
    );
  }

  // Create a map of users for quick lookup
  const userMap = new Map(allUsers.map(([principal, profile]) => [principal.toString(), profile]));

  // Filter members array to only include unique principals (remove duplicates)
  const uniqueMemberPrincipals = Array.from(new Set(community.members.map(p => p.toString())))
    .map(principalStr => community.members.find(p => p.toString() === principalStr))
    .filter((p): p is Principal => p !== undefined);

  // Create voting members list from unique members array
  // Note: With current backend limitations, we trust the members array contains only valid members
  // In a fully implemented system, we would also verify their role status
  const votingMembers: Array<{ principal: Principal; profile: UserProfile | null }> = 
    uniqueMemberPrincipals.map(memberPrincipal => ({
      principal: memberPrincipal,
      profile: userMap.get(memberPrincipal.toString()) || null
    }));

  // For admins, we identify them separately since they're not in the members array
  // The community admin (creator) is a global admin
  const globalAdmins: Array<{ principal: Principal; profile: UserProfile | null }> = [{
    principal: community.admin,
    profile: userMap.get(community.admin.toString()) || null
  }];

  // Community admins would be identified here when per-community roles are supported
  const communityAdmins: Array<{ principal: Principal; profile: UserProfile | null }> = [];

  const renderMemberList = (
    title: string,
    members: Array<{ principal: Principal; profile: UserProfile | null }>,
    roleLabel: string,
    roleColor: string,
    emptyMessage: string
  ) => (
    <div className="mb-8">
      <h4 className="text-xl font-bold text-black mb-4 amnesty-heading">{title}</h4>
      {members.length === 0 ? (
        <div className="text-center py-6 bg-amnesty-gray-100 border-4 border-black">
          <p className="text-lg text-black">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div 
              key={member.principal.toString()} 
              className="border-4 border-black p-4 bg-white hover:bg-amnesty-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h5 className="text-lg font-bold text-black amnesty-heading">
                      {member.profile?.name || 'UNNAMED MEMBER'}
                    </h5>
                    <span className={`px-3 py-1 text-sm font-bold amnesty-heading border-2 border-black ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </div>
                  <div className="bg-amnesty-gray-100 border-2 border-black p-2">
                    <p className="text-xs text-black font-mono break-all">
                      <span className="font-bold amnesty-heading">PRINCIPAL ID:</span>
                    </p>
                    <p className="text-xs text-black font-mono break-all mt-1">
                      {member.principal.toString()}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="w-10 h-10 bg-amnesty-yellow border-4 border-black flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
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

  return (
    <div className="bg-white border-4 border-black p-8 shadow-amnesty">
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-black amnesty-heading">COMMUNITY GOVERNANCE</h3>
        <p className="text-lg text-black mt-2">
          Members with governance privileges in this community
        </p>
      </div>

      {/* Backend Implementation Status */}
      <div className="mb-8 p-4 bg-amnesty-yellow border-4 border-black">
        <div className="flex">
          <svg className="w-6 h-6 text-black mt-1 mr-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <div>
            <h4 className="text-lg font-bold text-black mb-1 amnesty-heading">BACKEND IMPLEMENTATION STATUS</h4>
            <p className="text-black">
              The current backend implementation shows users from the community's members array. 
              For full functionality, the backend needs atomic operations to ensure only users with "member" role 
              appear in these lists, and automatic cleanup when roles change.
            </p>
          </div>
        </div>
      </div>

      {/* Global Admins */}
      {renderMemberList(
        "GLOBAL ADMINS",
        globalAdmins,
        "GLOBAL ADMIN",
        "bg-amnesty-yellow text-black",
        "No global admins in this community."
      )}

      {/* Community Admins */}
      {renderMemberList(
        "COMMUNITY ADMINS",
        communityAdmins,
        "COMMUNITY ADMIN",
        "bg-black text-white",
        "No community-specific admins assigned. (Per-community roles not supported)"
      )}

      {/* Voting Members */}
      {renderMemberList(
        "VOTING MEMBERS",
        votingMembers,
        "MEMBER",
        "bg-amnesty-gray-200 text-black",
        "No voting members in this community."
      )}

      <div className="mt-8 p-4 bg-amnesty-yellow border-4 border-black">
        <div className="flex">
          <svg className="w-6 h-6 text-black mt-1 mr-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <div>
            <h4 className="text-lg font-bold text-black mb-1 amnesty-heading">GOVERNANCE ROLES</h4>
            <p className="text-black">
              <strong>Global Admins</strong> have administrative privileges across all communities. 
              <strong>Community Admins</strong> would manage specific communities (not currently supported). 
              <strong>Voting Members</strong> are users in the community's members array. 
              The system displays unique members only, filtering out any duplicates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
