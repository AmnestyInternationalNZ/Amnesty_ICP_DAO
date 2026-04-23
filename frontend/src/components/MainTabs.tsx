import React, { useState } from 'react';
import { useGetCallerUserRole, useIsCallerAdmin } from '../hooks/useQueries';
import { UserRole } from '../backend';
import AdminPanel from './AdminPanel';
import Dashboard from './Dashboard';
import LoadingSpinner from './LoadingSpinner';

export default function MainTabs() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin'>('dashboard');
  const { data: userRole, isLoading: roleLoading } = useGetCallerUserRole();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

  if (roleLoading || adminLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const getRoleDisplayName = (role: UserRole, isAdminUser: boolean) => {
    if (isAdminUser) return 'ADMIN';
    if (role === UserRole.user) return 'MEMBER';
    return role.toUpperCase();
  };

  return (
    <div className="space-y-8">
      {/* Role Badge */}
      <div className="bg-white border-4 border-black p-8 shadow-amnesty">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-black amnesty-heading mb-2">
              {activeTab === 'dashboard' ? 'DASHBOARD' : 'ADMIN PANEL'}
            </h2>
            <p className="text-xl text-black">
              {activeTab === 'dashboard' 
                ? 'Manage your communities' 
                : 'Administrative functions and role management'
              }
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`px-6 py-3 text-lg font-bold amnesty-heading border-4 ${
              isAdmin 
                ? 'bg-amnesty-yellow text-black border-black' 
                : userRole === UserRole.user 
                  ? 'bg-amnesty-gray-200 text-black border-black'
                  : 'bg-amnesty-gray-100 text-black border-black'
            }`}>
              {getRoleDisplayName(userRole || UserRole.guest, isAdmin || false)}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-4 border-black shadow-amnesty">
        <div className="flex border-b-4 border-black">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 px-8 py-6 font-bold uppercase tracking-wide text-xl amnesty-heading transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-amnesty-yellow text-black border-r-4 border-black'
                : 'bg-white text-black hover:bg-amnesty-gray-100 border-r-4 border-black'
            }`}
          >
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
              </svg>
              <span>DASHBOARD</span>
            </div>
          </button>
          
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 px-8 py-6 font-bold uppercase tracking-wide text-xl amnesty-heading transition-colors ${
                activeTab === 'admin'
                  ? 'bg-amnesty-yellow text-black'
                  : 'bg-white text-black hover:bg-amnesty-gray-100'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>ADMIN PANEL</span>
              </div>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === 'dashboard' ? (
            <div className="p-8">
              <Dashboard />
            </div>
          ) : isAdmin ? (
            <div className="p-8">
              <AdminPanel />
            </div>
          ) : null}
        </div>
      </div>

      {/* Admin Access Notice for Non-Admins */}
      {!isAdmin && (
        <div className="bg-white border-4 border-black p-8 shadow-amnesty">
          <div className="flex">
            <svg className="w-8 h-8 text-black mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <div>
              <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">ADMIN PANEL ACCESS</h4>
              <p className="text-lg text-black">
                The Admin Panel is only available to administrators. Contact an admin to request elevated privileges if you need access to administrative functions.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
