import React from 'react';
import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import LoginButton from './components/LoginButton';
import ProfileSetup from './components/ProfileSetup';
import MainTabs from './components/MainTabs';
import LoadingSpinner from './components/LoadingSpinner';
import AmnestyLogo from './components/AmnestyLogo';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;
  const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-amnesty-yellow border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <h1 className="text-4xl font-bold text-black amnesty-heading">
                AMNESTY DAO
              </h1>
            </div>
            <div className="flex items-center space-x-6">
              {isAuthenticated && userProfile && (
                <span className="text-lg font-bold text-black amnesty-heading">
                  WELCOME, {userProfile.name.toUpperCase()}
                </span>
              )}
              <LoginButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!isAuthenticated ? (
          <div className="text-center py-16">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border-4 border-black p-12 shadow-amnesty">
                <div className="w-24 h-24 bg-amnesty-yellow border-4 border-black flex items-center justify-center mx-auto mb-8">
                  <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-black mb-4 amnesty-heading">
                  WELCOME TO AMNESTY DAO
                </h2>
                <p className="text-xl text-black mb-8 leading-relaxed">
                  A decentralized governance platform for community decision-making. 
                  Please log in to access communities, create proposals, and participate in voting.
                </p>
                <LoginButton />
              </div>
            </div>
          </div>
        ) : showProfileSetup ? (
          <ProfileSetup />
        ) : profileLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="large" />
          </div>
        ) : (
          <MainTabs />
        )}
      </main>

      <AmnestyLogo />
    </div>
  );
}
