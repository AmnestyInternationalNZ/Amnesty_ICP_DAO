import React, { useState } from 'react';
import { useListCommunities, useCreateCommunity, useIsCallerAdmin, useJoinCommunity, useGetCallerUserRole, useEnterCommunityPortal } from '../hooks/useQueries';
import { UserRole } from '../backend';
import LoadingSpinner from './LoadingSpinner';
import CreateCommunityModal from './CreateCommunityModal';
import CommunityPortal from './CommunityPortal';

export default function CommunitiesSection() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<bigint | null>(null);
  const { data: communities, isLoading: communitiesLoading } = useListCommunities();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const { data: userRole, isLoading: roleLoading } = useGetCallerUserRole();
  const joinCommunity = useJoinCommunity();

  const canCreateCommunity = isAdmin && !adminLoading;
  const canJoinCommunities = (userRole === UserRole.user || isAdmin) ?? false;

  const handleJoinCommunity = async (communityId: bigint) => {
    try {
      await joinCommunity.mutateAsync(communityId);
    } catch (error) {
      console.error('Failed to join community:', error);
    }
  };

  const handleEnterCommunity = (communityId: bigint) => {
    setSelectedCommunityId(communityId);
  };

  const handleBackToCommunities = () => {
    setSelectedCommunityId(null);
  };

  if (selectedCommunityId !== null) {
    return (
      <CommunityPortal 
        communityId={selectedCommunityId} 
        onBack={handleBackToCommunities}
      />
    );
  }

  if (communitiesLoading || adminLoading || roleLoading) {
    return (
      <div className="bg-white border-4 border-black p-8 shadow-amnesty">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-4 border-black p-8 shadow-amnesty">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-black amnesty-heading">COMMUNITIES</h3>
            <p className="text-xl text-black mt-2">
              {userRole === UserRole.guest 
                ? "View communities and explore their content"
                : "Join communities to participate in governance"
              }
            </p>
          </div>
          {canCreateCommunity && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-lg"
            >
              CREATE COMMUNITY
            </button>
          )}
        </div>

        {/* Guest Information */}
        {userRole === UserRole.guest && (
          <div className="mb-8 p-6 bg-amnesty-yellow border-4 border-black">
            <div className="flex">
              <svg className="w-8 h-8 text-black mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div>
                <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">GUEST ACCESS</h4>
                <p className="text-lg text-black">
                  You can view communities and their content, but to join communities and participate in governance, 
                  you need to be promoted to member status by an administrator.
                </p>
              </div>
            </div>
          </div>
        )}

        {!communities || communities.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-amnesty-gray-200 border-4 border-black flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 4c0-1.11.89-2 2-2s2 .89 2-2-.89-2-2-2-2 .89-2 2zM4 18v-4h3v4h2v-7.5c0-1.1.9-2 2-2s2 .9 2 2V18h2v-4h3v4h4v2H0v-2h4z"/>
              </svg>
            </div>
            <h4 className="text-2xl font-bold text-black mb-4 amnesty-heading">NO COMMUNITIES YET</h4>
            <p className="text-xl text-black mb-8">
              {canCreateCommunity 
                ? "Create the first community to get started with collaborative governance."
                : "Communities will appear here once they are created by administrators."
              }
            </p>
            {canCreateCommunity && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-xl"
              >
                CREATE FIRST COMMUNITY
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => {
              const isJoining = joinCommunity.isPending;
              
              return (
                <CommunityCard 
                  key={community.id.toString()} 
                  community={community}
                  userRole={userRole}
                  canJoinCommunities={canJoinCommunities}
                  isJoining={isJoining}
                  onJoin={handleJoinCommunity}
                  onEnter={handleEnterCommunity}
                />
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateCommunityModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </>
  );
}

interface CommunityCardProps {
  community: any;
  userRole?: UserRole;
  canJoinCommunities: boolean;
  isJoining: boolean;
  onJoin: (communityId: bigint) => void;
  onEnter: (communityId: bigint) => void;
}

function CommunityCard({ 
  community, 
  userRole, 
  canJoinCommunities, 
  isJoining, 
  onJoin, 
  onEnter 
}: CommunityCardProps) {
  const { data: portalAccess } = useEnterCommunityPortal(community.id);
  
  // Check if user is already a member by trying to access the portal
  const isAlreadyMember = !!portalAccess;
  
  // Determine if join button should be shown - only for non-guests who aren't already members
  const showJoinButton = canJoinCommunities && !isAlreadyMember && userRole !== UserRole.guest;

  return (
    <div className="border-4 border-black p-6 hover:shadow-amnesty transition-all bg-white">
      <div className="flex items-start justify-between mb-4">
        <h4 className="text-xl font-bold text-black amnesty-heading truncate">{community.name}</h4>
        <span className="text-sm bg-amnesty-yellow text-black px-3 py-1 border-2 border-black amnesty-heading">
          ID: {community.id.toString()}
        </span>
      </div>
      
      <p className="text-lg text-black mb-6 line-clamp-3">{community.policy}</p>

      {/* Membership status indicator */}
      {isAlreadyMember && userRole !== UserRole.guest && (
        <div className="mb-4 p-3 bg-amnesty-yellow border-2 border-black">
          <p className="text-sm font-bold text-black amnesty-heading">
            ✓ YOU ARE A MEMBER
          </p>
        </div>
      )}

      <div className="flex space-x-3">
        {/* All authenticated users can enter community portals */}
        <button 
          onClick={() => onEnter(community.id)}
          className="flex-1 bg-amnesty-gray-200 text-black py-3 px-4 font-bold uppercase tracking-wide hover:bg-amnesty-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-400 text-lg amnesty-heading border-4 border-black"
        >
          {userRole === UserRole.guest ? 'VIEW COMMUNITY' : 'ENTER COMMUNITY'}
        </button>
        
        {/* Join button - only show if user can join and isn't already a member */}
        {showJoinButton && (
          <button 
            onClick={() => onJoin(community.id)}
            disabled={isJoining}
            className="bg-black text-white py-3 px-4 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center amnesty-heading border-4 border-black"
          >
            {isJoining ? (
              <>
                <LoadingSpinner size="small" className="mr-2" />
                JOINING...
              </>
            ) : (
              'JOIN'
            )}
          </button>
        )}

        {/* Show disabled join button for guests with explanation */}
        {userRole === UserRole.guest && (
          <button 
            disabled
            className="bg-amnesty-gray-300 text-amnesty-gray-600 py-3 px-4 font-bold uppercase tracking-wide border-4 border-black amnesty-heading text-lg cursor-not-allowed opacity-50"
            title="Guests cannot join communities. Contact an admin to become a member."
          >
            GUESTS CANNOT JOIN
          </button>
        )}

        {/* Show status for already joined members */}
        {isAlreadyMember && userRole !== UserRole.guest && (
          <button 
            disabled
            className="bg-amnesty-gray-300 text-amnesty-gray-600 py-3 px-4 font-bold uppercase tracking-wide border-4 border-black amnesty-heading text-lg cursor-not-allowed opacity-50"
            title="You are already a member of this community"
          >
            ALREADY JOINED
          </button>
        )}
      </div>
    </div>
  );
}
