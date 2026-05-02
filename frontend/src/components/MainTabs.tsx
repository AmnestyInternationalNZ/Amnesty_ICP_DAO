import React, { useState } from 'react';
import {
  useBootstrapPlatformAdmin,
  useGetCallerPlatformRole,
  useIsCallerPlatformAdmin,
  useListPlatformAdmins
} from '../hooks/useQueries';
import { PlatformRole } from '../backend';
import AdminPanel from './AdminPanel';
import Dashboard from './Dashboard';
import LoadingSpinner from './LoadingSpinner';

export default function MainTabs() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin'>('dashboard');
  const { data: platformRole, isLoading: roleLoading } = useGetCallerPlatformRole();
  const { data: isPlatformAdmin, isLoading: adminLoading } = useIsCallerPlatformAdmin();
  const { data: platformAdmins, isLoading: platformAdminsLoading } = useListPlatformAdmins();
  const bootstrapPlatformAdmin = useBootstrapPlatformAdmin();

  if (roleLoading || adminLoading || platformAdminsLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const adminCount = platformAdmins?.length ?? 0;
  const needsBootstrap = adminCount === 0;
  const isAdmin = !!isPlatformAdmin;
  const roleLabel = platformRole === PlatformRole.platformAdmin ? 'Platform admin' : 'Viewer';

  const handleBootstrap = async () => {
    try {
      await bootstrapPlatformAdmin.mutateAsync();
    } catch (error) {
      console.error('Failed to bootstrap platform admin:', error);
    }
  };

  return (
    <div id="platform" className="space-y-12">
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
        <div>
          <p className="amnesty-kicker text-amnesty-pink mb-4">Amnesty Community</p>
          <h1 id="dashboard" className="max-w-4xl text-5xl text-amnesty-ink md:text-7xl amnesty-heading">
            Take action together
          </h1>
          <p className="mt-6 max-w-3xl text-xl leading-8 text-amnesty-ink">
            Read communities as a viewer, step into decision-making wherever you hold a
            role, and keep platform participation grounded in people power.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="amnesty-panel bg-white p-6">
            <p className="amnesty-kicker text-amnesty-blue mb-3">Your access</p>
            <p className="text-4xl text-amnesty-ink amnesty-heading">{roleLabel}</p>
            <p className="mt-4 text-base leading-7 text-[#38505d]">
              Viewers can read across the platform. Community roles unlock proposals,
              voting, fundraising, and membership stewardship.
            </p>
          </div>

          <div className="amnesty-panel bg-white p-6">
            <p className="amnesty-kicker text-amnesty-green mb-3">Platform roles</p>
            <p className="text-4xl text-amnesty-ink amnesty-heading">{adminCount}</p>
            <p className="mt-4 text-base leading-7 text-[#38505d]">
              Platform admins manage platform-wide access and can support membership across
              every community.
            </p>
          </div>
        </div>
      </section>

      {needsBootstrap && (
        <section className="amnesty-dark-band px-8 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="amnesty-kicker text-amnesty-yellow mb-3">Platform setup</p>
              <h2 className="text-3xl text-white amnesty-heading">Claim the first platform admin</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/80">
                No platform admin exists yet. Claim the first role explicitly before
                communities and member assignments can be managed.
              </p>
            </div>
            <button
              onClick={handleBootstrap}
              disabled={bootstrapPlatformAdmin.isPending}
              className="btn-primary rounded-full"
            >
              {bootstrapPlatformAdmin.isPending ? 'Claiming...' : 'Claim platform admin'}
            </button>
          </div>
        </section>
      )}

      <section className="border-b border-amnesty-line">
        <div className="flex flex-wrap items-end gap-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 text-lg amnesty-heading ${
              activeTab === 'dashboard'
                ? 'border-b-4 border-amnesty-yellow text-amnesty-ink'
                : 'border-b-4 border-transparent text-[#6b7f89] hover:text-amnesty-ink'
            }`}
          >
            Dashboard
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`pb-4 text-lg amnesty-heading ${
                activeTab === 'admin'
                  ? 'border-b-4 border-amnesty-pink text-amnesty-ink'
                  : 'border-b-4 border-transparent text-[#6b7f89] hover:text-amnesty-ink'
              }`}
            >
              Platform admin
            </button>
          )}
        </div>
      </section>

      <div className="min-h-[600px]">
        {activeTab === 'dashboard' ? <Dashboard /> : isAdmin ? <AdminPanel /> : null}
      </div>

      {!isAdmin && !needsBootstrap && (
        <section className="border border-amnesty-line bg-white px-6 py-5">
          <p className="amnesty-kicker text-amnesty-blue mb-3">Role model</p>
          <p className="text-lg leading-8 text-amnesty-ink">
            Platform-wide access is reserved for the people stewarding community roles.
            Participation itself remains community-scoped, so members can focus on local
            organising and decision-making.
          </p>
        </section>
      )}
    </div>
  );
}
