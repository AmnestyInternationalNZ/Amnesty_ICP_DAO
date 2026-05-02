import React, { useState } from 'react';
import { Community, CommunityRole } from '../backend';
import {
  useGetCommunityAccess,
  useIsCallerPlatformAdmin,
  useListCommunities
} from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';
import CreateCommunityModal from './CreateCommunityModal';
import CommunityPortal from './CommunityPortal';

export default function CommunitiesSection() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<bigint | null>(null);
  const { data: communities, isLoading: communitiesLoading } = useListCommunities();
  const { data: isPlatformAdmin, isLoading: platformAdminLoading } = useIsCallerPlatformAdmin();

  if (selectedCommunityId !== null) {
    return <CommunityPortal communityId={selectedCommunityId} onBack={() => setSelectedCommunityId(null)} />;
  }

  if (communitiesLoading || platformAdminLoading) {
    return (
      <div className="amnesty-panel bg-white p-8">
        <div className="flex justify-center py-16">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  const canCreateCommunity = !!isPlatformAdmin;

  return (
    <>
      <section id="communities" className="space-y-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="amnesty-kicker text-amnesty-blue mb-4">Communities</p>
            <h2 className="max-w-3xl text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
              Read every community. Participate where you are trusted to act.
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#38505d]">
              Community roles are explicit, but browsing stays open to every authenticated
              person so ideas, campaigns, and local context remain visible.
            </p>
          </div>

          {canCreateCommunity && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary rounded-full">
              Create community
            </button>
          )}
        </div>

        {!communities || communities.length === 0 ? (
          <div className="amnesty-dark-band px-8 py-10">
            <p className="amnesty-kicker text-amnesty-yellow mb-4">Community setup</p>
            <h3 className="text-4xl text-white amnesty-heading">
              No communities have been published yet.
            </h3>
            <p className="mt-5 max-w-3xl text-base leading-8 text-white/80">
              {canCreateCommunity
                ? 'Create the first community to start assigning roles, shaping proposals, and coordinating campaigns.'
                : 'A platform admin needs to create the first community before members can be assigned.'}
            </p>
            {canCreateCommunity && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary mt-8 rounded-full">
                Create first community
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {communities.map((community) => (
              <CommunityCard
                key={community.id.toString()}
                community={community}
                onEnter={(communityId) => setSelectedCommunityId(communityId)}
              />
            ))}
          </div>
        )}
      </section>

      {showCreateModal && (
        <CreateCommunityModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}

interface CommunityCardProps {
  community: Community;
  onEnter: (communityId: bigint) => void;
}

function CommunityCard({ community, onEnter }: CommunityCardProps) {
  const { data: access, isLoading } = useGetCommunityAccess(community.id);

  const roleLabel = !access
    ? 'Checking access'
    : access.isPlatformAdmin
      ? 'Platform admin'
      : access.communityRole === CommunityRole.communityAdmin
        ? 'Community admin'
        : access.communityRole === CommunityRole.member
          ? 'Member'
          : 'Viewer';

  const accentTone = !access
    ? 'bg-amnesty-blue'
    : access.isPlatformAdmin || access.communityRole === CommunityRole.communityAdmin
      ? 'bg-amnesty-pink'
      : access.communityRole === CommunityRole.member
        ? 'bg-amnesty-green'
        : 'bg-amnesty-yellow';

  const participationCopy = !access
    ? 'We are checking your community access.'
    : access.canCreateProposal
      ? 'You can help shape proposals and campaigns in this community.'
      : 'You have read-only viewer access here until a role is assigned.';

  return (
    <article className="amnesty-panel bg-white p-7 amnesty-card-lift">
      <div className={`mb-6 h-1.5 w-24 ${accentTone}`} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="amnesty-kicker text-amnesty-blue mb-3">Community space</p>
          <h3 className="text-4xl text-amnesty-ink amnesty-heading">{community.name}</h3>
        </div>
        <span className="border border-amnesty-line px-3 py-2 text-sm text-amnesty-ink amnesty-heading">
          #{community.id.toString()}
        </span>
      </div>

      <p className="mt-5 text-lg leading-8 text-[#38505d] line-clamp-4">{community.policy}</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="bg-[#eef3f5] px-3 py-2 text-sm text-amnesty-ink amnesty-heading">
          {isLoading ? 'Loading role' : roleLabel}
        </span>
        <span className="bg-white px-3 py-2 text-sm text-[#38505d] border border-amnesty-line amnesty-heading">
          {community.members.length} assigned
        </span>
      </div>

      <p className="mt-6 text-base leading-7 text-[#38505d]">{participationCopy}</p>

      <button onClick={() => onEnter(community.id)} className="btn-secondary mt-8">
        Open community
      </button>
    </article>
  );
}
