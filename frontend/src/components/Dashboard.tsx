import React from 'react';
import CommunitiesSection from './CommunitiesSection';

interface DashboardProps {
  onEnterCommunity: (communityId: bigint) => void;
}

export default function Dashboard({ onEnterCommunity }: DashboardProps) {
  return (
    <div className="space-y-8">
      <CommunitiesSection onEnterCommunity={onEnterCommunity} />
    </div>
  );
}
