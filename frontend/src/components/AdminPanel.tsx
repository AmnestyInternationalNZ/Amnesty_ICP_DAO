import React, { useState } from 'react';
import { useAssignUserRole, useGetUserProfile, useListCommunities, useListAllUsers, useRemoveMemberFromCommunity } from '../hooks/useQueries';
import { UserRole } from '../backend';
import { Principal } from '@dfinity/principal';
import LoadingSpinner from './LoadingSpinner';
import RemoveMemberModal from './RemoveMemberModal';

export default function AdminPanel() {
  const [selectedUser, setSelectedUser] = useState<Principal | null>(null);
  const [principalText, setPrincipalText] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.guest);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('global');
  const [isExpanded, setIsExpanded] = useState(false);
  const [userSelectionMode, setUserSelectionMode] = useState<'list' | 'manual'>('list');
  const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(false);

  const assignRole = useAssignUserRole();
  const getUserProfile = useGetUserProfile();
  const { data: communities, isLoading: communitiesLoading } = useListCommunities();
  const { data: allUsers, isLoading: usersLoading } = useListAllUsers();

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) return;

    try {
      const communityId = selectedCommunityId === 'global' ? null : BigInt(selectedCommunityId);
      await assignRole.mutateAsync({ 
        user: selectedUser, 
        role: selectedRole,
        communityId 
      });
      
      // Reset form
      setSelectedUser(null);
      setPrincipalText('');
      setSelectedRole(UserRole.guest);
      setSelectedCommunityId('global');
    } catch (error) {
      console.error('Failed to assign role:', error);
    }
  };

  const handleUserSelection = (user: Principal) => {
    setSelectedUser(user);
    setPrincipalText(user.toString());
  };

  const handleManualUserInput = () => {
    try {
      const principal = Principal.fromText(principalText.trim());
      setSelectedUser(principal);
    } catch (error) {
      console.error('Invalid principal ID:', error);
      setSelectedUser(null);
    }
  };

  const handleLookupUser = async () => {
    if (!selectedUser) return;
    
    try {
      const profile = await getUserProfile.mutateAsync(selectedUser);
      console.log('Member profile:', profile);
    } catch (error) {
      console.error('Failed to lookup member:', error);
    }
  };

  const handleRemoveMember = () => {
    if (!selectedUser || selectedCommunityId === 'global') return;
    setShowRemoveMemberModal(true);
  };

  const isPromotingToMember = selectedRole === UserRole.user;
  const isDemotingFromMember = selectedRole === UserRole.guest;
  const isGlobalMemberPromotion = isPromotingToMember && selectedCommunityId === 'global';
  const isGlobalGuestDemotion = isDemotingFromMember && selectedCommunityId === 'global';
  const isCommunityMemberPromotion = isPromotingToMember && selectedCommunityId !== 'global';
  const isCommunityGuestDemotion = isDemotingFromMember && selectedCommunityId !== 'global';

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case UserRole.admin:
        return 'ADMIN';
      case UserRole.user:
        return 'MEMBER';
      case UserRole.guest:
        return 'GUEST';
    }
  };

  const selectedCommunity = communities?.find(c => c.id.toString() === selectedCommunityId);
  const canRemoveMember = selectedUser && selectedCommunityId !== 'global' && selectedCommunity;

  return (
    <>
      <div className="bg-white border-4 border-black shadow-amnesty">
        <div className="p-8 border-b-4 border-black bg-amnesty-yellow">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div>
              <h3 className="text-2xl font-bold text-black amnesty-heading">ADMIN PANEL</h3>
              <p className="text-lg text-black mt-2">Manage member roles and community membership</p>
            </div>
            <svg
              className={`w-8 h-8 text-black transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="p-8 space-y-8">
            {/* Backend Limitation Notice */}
            <div className="bg-amnesty-yellow border-4 border-black p-6">
              <div className="flex">
                <svg className="w-8 h-8 text-black mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">CURRENT BACKEND LIMITATIONS</h4>
                  <p className="text-lg text-black mb-3">
                    The current backend implementation has the following limitations:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-black">
                    <li>Per-community roles are not fully supported - all role assignments are global</li>
                    <li>Atomic role change operations with automatic community membership synchronization are not implemented</li>
                    <li>System-wide consistency checks for member arrays are not enforced</li>
                    <li>Manual community membership management is required</li>
                  </ul>
                  <p className="text-sm text-black mt-3 font-bold">
                    Role changes will affect the user globally, and community memberships must be managed separately.
                  </p>
                  <div className="mt-4 p-3 bg-green-200 border-2 border-green-600">
                    <p className="text-green-800 font-bold">
                      ✅ NEW: Admin member removal function is now implemented and functional!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Selection Mode Toggle */}
            <div>
              <h4 className="text-xl font-bold text-black mb-6 amnesty-heading">SELECT MEMBER</h4>
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setUserSelectionMode('list')}
                  className={`px-6 py-3 font-bold uppercase tracking-wide border-4 border-black amnesty-heading ${
                    userSelectionMode === 'list' 
                      ? 'bg-amnesty-yellow text-black' 
                      : 'bg-amnesty-gray-200 text-black hover:bg-amnesty-gray-300'
                  }`}
                >
                  SELECT FROM LIST
                </button>
                <button
                  onClick={() => setUserSelectionMode('manual')}
                  className={`px-6 py-3 font-bold uppercase tracking-wide border-4 border-black amnesty-heading ${
                    userSelectionMode === 'manual' 
                      ? 'bg-amnesty-yellow text-black' 
                      : 'bg-amnesty-gray-200 text-black hover:bg-amnesty-gray-300'
                  }`}
                >
                  ENTER PRINCIPAL ID
                </button>
              </div>

              {userSelectionMode === 'list' ? (
                <div>
                  {usersLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner size="medium" />
                    </div>
                  ) : !allUsers || allUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-lg text-black">No members found</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border-4 border-black">
                      {allUsers.map(([principal, profile]) => (
                        <button
                          key={principal.toString()}
                          onClick={() => handleUserSelection(principal)}
                          className={`w-full p-4 text-left border-b-2 border-black hover:bg-amnesty-gray-100 transition-colors ${
                            selectedUser?.toString() === principal.toString() 
                              ? 'bg-amnesty-yellow' 
                              : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-black amnesty-heading truncate">
                                {profile?.name || 'UNNAMED MEMBER'}
                              </p>
                              <p className="text-sm text-amnesty-gray-600 font-mono break-all">
                                {principal.toString()}
                              </p>
                            </div>
                            <div className="text-sm ml-4 flex-shrink-0">
                              <span className="bg-amnesty-gray-200 text-black px-2 py-1 border-2 border-black amnesty-heading">
                                MEMBER
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label htmlFor="principal" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                    MEMBER PRINCIPAL ID
                  </label>
                  <div className="flex space-x-4">
                    <input
                      type="text"
                      id="principal"
                      value={principalText}
                      onChange={(e) => {
                        setPrincipalText(e.target.value);
                        handleManualUserInput();
                      }}
                      className="flex-1 input-field text-lg font-mono"
                      placeholder="Enter principal ID"
                      disabled={assignRole.isPending}
                    />
                    <button
                      type="button"
                      onClick={handleLookupUser}
                      disabled={!selectedUser || getUserProfile.isPending}
                      className="px-6 py-4 border-4 border-black text-black bg-amnesty-gray-200 hover:bg-amnesty-gray-300 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center amnesty-heading font-bold text-lg"
                    >
                      {getUserProfile.isPending ? (
                        <LoadingSpinner size="small" />
                      ) : (
                        'LOOKUP'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Role Assignment Form */}
            {selectedUser && (
              <form onSubmit={handleAssignRole} className="space-y-6 border-t-4 border-black pt-8">
                <h4 className="text-xl font-bold text-black mb-6 amnesty-heading">MANAGE MEMBER</h4>
                
                {/* Current User Info */}
                <div className="bg-amnesty-gray-100 border-4 border-black p-6">
                  <h5 className="text-lg font-bold text-black mb-4 amnesty-heading">SELECTED MEMBER</h5>
                  <div className="space-y-2">
                    <p className="text-lg text-black">
                      <strong className="amnesty-heading">PRINCIPAL ID:</strong>
                    </p>
                    <p className="text-sm text-black font-mono bg-white border-2 border-black p-2 break-all">
                      {selectedUser.toString()}
                    </p>
                  </div>
                </div>

                {/* Community Selection */}
                <div>
                  <label htmlFor="community" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                    SCOPE
                  </label>
                  <select
                    id="community"
                    value={selectedCommunityId}
                    onChange={(e) => setSelectedCommunityId(e.target.value)}
                    className="input-field text-lg"
                    disabled={assignRole.isPending || communitiesLoading}
                  >
                    <option value="global">GLOBAL ROLE</option>
                    {communities?.map((community) => (
                      <option key={community.id.toString()} value={community.id.toString()}>
                        {community.name.toUpperCase()} (ID: {community.id.toString()})
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-amnesty-gray-600 mt-2 font-bold">
                    NOTE: Current backend only supports global roles. Per-community role assignment is not yet implemented.
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <label htmlFor="role" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                    ROLE
                  </label>
                  <select
                    id="role"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    className="input-field text-lg"
                    disabled={assignRole.isPending}
                  >
                    <option value={UserRole.guest}>GUEST</option>
                    <option value={UserRole.user}>MEMBER</option>
                    <option value={UserRole.admin}>
                      {selectedCommunityId === 'global' ? 'ADMIN' : 'COMMUNITY ADMIN'}
                    </option>
                  </select>
                </div>

                {/* Role Description with Backend Limitations */}
                <div className={`border-4 p-6 ${
                  isDemotingFromMember ? 'bg-red-100 border-red-600' : 
                  isPromotingToMember ? 'bg-green-100 border-green-600' : 
                  'bg-amnesty-yellow border-black'
                }`}>
                  <div className="flex">
                    <svg className={`w-8 h-8 mt-1 mr-4 ${
                      isDemotingFromMember ? 'text-red-600' : 
                      isPromotingToMember ? 'text-green-600' : 
                      'text-black'
                    }`} fill="currentColor" viewBox="0 0 24 24">
                      {isDemotingFromMember ? (
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                      ) : isPromotingToMember ? (
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      ) : (
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      )}
                    </svg>
                    <div>
                      <h4 className={`text-lg font-bold mb-2 amnesty-heading ${
                        isDemotingFromMember ? 'text-red-600' : 
                        isPromotingToMember ? 'text-green-600' : 
                        'text-black'
                      }`}>
                        {isDemotingFromMember ? '⚠️ ROLE DEMOTION - REQUIRES BACKEND UPDATE' : 
                         isPromotingToMember ? '✅ MEMBER PROMOTION - MANUAL JOINING REQUIRED' : 
                         'ROLE ASSIGNMENT - LIMITED BACKEND SUPPORT'}
                      </h4>
                      <div className={`text-lg ${
                        isDemotingFromMember ? 'text-red-800' : 
                        isPromotingToMember ? 'text-green-800' : 
                        'text-black'
                      }`}>
                        {isGlobalGuestDemotion && (
                          <div className="space-y-3">
                            <p className="font-bold">
                              ⚠️ GLOBAL GUEST DEMOTION - BACKEND UPDATE NEEDED:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>User's global role will be changed to guest</li>
                              <li><strong>IMPORTANT:</strong> Backend needs atomic operations to automatically remove user from all community members arrays</li>
                              <li>Current backend requires manual cleanup of community memberships</li>
                              <li>User will lose voting privileges but may still appear in member lists until backend is updated</li>
                              <li>Historical proposals and votes will be preserved</li>
                            </ul>
                            <p className="font-bold text-red-900 bg-red-200 p-3 border-2 border-red-600">
                              Backend needs implementation of atomic role change operations with automatic community membership synchronization.
                            </p>
                          </div>
                        )}
                        {isCommunityGuestDemotion && (
                          <div className="space-y-3">
                            <p className="font-bold">
                              ⚠️ COMMUNITY GUEST DEMOTION - NOT SUPPORTED:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Per-community roles are not supported by the current backend</li>
                              <li>This will assign a global guest role instead</li>
                              <li>Backend needs atomic operations to update community memberships</li>
                            </ul>
                            <p className="font-bold text-red-900 bg-red-200 p-2 border-2 border-red-600">
                              Per-community role management requires backend implementation.
                            </p>
                          </div>
                        )}
                        {isGlobalMemberPromotion && (
                          <div className="space-y-3">
                            <p className="font-bold">
                              ✅ GLOBAL MEMBER PROMOTION - MANUAL COMMUNITY JOINING REQUIRED:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>User's global role will be changed to member</li>
                              <li>User will gain the ability to join communities</li>
                              <li>User must manually join each community they want to participate in</li>
                              <li>No automatic community membership assignment occurs</li>
                              <li>User can create proposals and vote only in communities they explicitly join</li>
                            </ul>
                            <p className="font-bold text-green-900 bg-green-200 p-3 border-2 border-green-600">
                              This promotes the user to member status globally, but community participation requires manual joining.
                            </p>
                          </div>
                        )}
                        {isCommunityMemberPromotion && (
                          <div className="space-y-3">
                            <p className="font-bold">
                              ⚠️ COMMUNITY MEMBER PROMOTION - NOT SUPPORTED:
                            </p>
                            <ul className="list-disc list-inside space-y-1 ml-4">
                              <li>Per-community roles are not supported by the current backend</li>
                              <li>This will assign a global member role instead</li>
                              <li>User must still manually join communities to participate</li>
                            </ul>
                            <p className="font-bold text-orange-900 bg-orange-200 p-2 border-2 border-orange-600">
                              Per-community role management requires backend implementation.
                            </p>
                          </div>
                        )}
                        {!isDemotingFromMember && !isPromotingToMember && (
                          <p>
                            {selectedCommunityId === 'global' 
                              ? `Assigning ${getRoleDisplayName(selectedRole)} role globally. This affects the member's permissions across all communities.`
                              : `Per-community role assignment is not supported. This will assign a global ${getRoleDisplayName(selectedRole)} role instead.`
                            }
                            <span className="block text-sm mt-2 text-amnesty-gray-600 font-bold">
                              NOTE: The current backend does not support atomic operations, consistency checks, or automatic community membership synchronization.
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    disabled={!selectedUser || assignRole.isPending}
                    className={`flex-1 text-lg py-4 flex items-center justify-center font-bold uppercase tracking-wide border-4 border-black amnesty-heading ${
                      isDemotingFromMember 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : isPromotingToMember
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-amnesty-yellow text-black hover:bg-yellow-300'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {assignRole.isPending ? (
                      <>
                        <LoadingSpinner size="small" className="mr-3" />
                        {isDemotingFromMember ? 'DEMOTING (BACKEND UPDATE NEEDED)...' : 
                         isPromotingToMember ? 'PROMOTING (MANUAL JOINING REQUIRED)...' : 
                         'ASSIGNING...'}
                      </>
                    ) : (
                      <>
                        {isDemotingFromMember ? 'DEMOTE TO GUEST (BACKEND UPDATE NEEDED)' : 
                         isPromotingToMember ? 'PROMOTE TO MEMBER (MANUAL JOINING REQUIRED)' : 
                         'ASSIGN ROLE'}
                      </>
                    )}
                  </button>

                  {/* Remove from Community Button */}
                  {canRemoveMember && (
                    <button
                      type="button"
                      onClick={handleRemoveMember}
                      disabled={assignRole.isPending}
                      className="flex-1 bg-black text-white py-4 px-6 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center amnesty-heading border-4 border-black"
                    >
                      REMOVE FROM COMMUNITY
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Enhanced Status Messages */}
            {assignRole.isError && (
              <div className="p-4 bg-black text-white border-4 border-amnesty-yellow">
                <p className="text-lg font-bold amnesty-heading">
                  FAILED TO ASSIGN ROLE. PLEASE CHECK YOUR PERMISSIONS AND TRY AGAIN.
                </p>
              </div>
            )}

            {assignRole.isSuccess && (
              <div className={`p-4 border-4 ${
                isDemotingFromMember ? 'bg-red-100 text-red-800 border-red-600' : 
                isPromotingToMember ? 'bg-green-100 text-green-800 border-green-600' : 
                'bg-amnesty-yellow text-black border-black'
              }`}>
                <p className="text-lg font-bold amnesty-heading">
                  {isDemotingFromMember 
                    ? 'USER DEMOTED TO GUEST! BACKEND UPDATE NEEDED FOR AUTOMATIC CLEANUP.'
                    : isPromotingToMember
                      ? 'USER PROMOTED TO MEMBER! USER MUST MANUALLY JOIN COMMUNITIES TO PARTICIPATE.'
                      : 'ROLE ASSIGNED SUCCESSFULLY! COMMUNITY MEMBERSHIPS MAY REQUIRE MANUAL MANAGEMENT.'
                  }
                </p>
                {isGlobalGuestDemotion && (
                  <p className="text-sm mt-2">
                    The user's global role has been changed to guest. Backend needs atomic operations to automatically remove them from all community member lists.
                  </p>
                )}
                {isCommunityGuestDemotion && (
                  <p className="text-sm mt-2">
                    Per-community roles are not supported. A global guest role was assigned instead. 
                    Backend needs atomic operations for community membership management.
                  </p>
                )}
                {isGlobalMemberPromotion && (
                  <p className="text-sm mt-2">
                    The user has been promoted to member status globally and can now join communities. 
                    They must manually join each community they want to participate in.
                  </p>
                )}
                {isCommunityMemberPromotion && (
                  <p className="text-sm mt-2">
                    Per-community roles are not supported. A global member role was assigned instead. 
                    The user must still manually join communities to participate.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showRemoveMemberModal && selectedUser && selectedCommunity && (
        <RemoveMemberModal
          isOpen={showRemoveMemberModal}
          onClose={() => setShowRemoveMemberModal(false)}
          user={selectedUser}
          community={selectedCommunity}
        />
      )}
    </>
  );
}
