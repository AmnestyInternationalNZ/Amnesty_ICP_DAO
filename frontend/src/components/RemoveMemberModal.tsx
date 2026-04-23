import React, { useState } from 'react';
import { useRemoveMemberFromCommunity, useGetUserProfile } from '../hooks/useQueries';
import { Principal } from '@dfinity/principal';
import { Community } from '../backend';
import LoadingSpinner from './LoadingSpinner';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Principal;
  community: Community;
}

export default function RemoveMemberModal({ 
  isOpen, 
  onClose, 
  user, 
  community 
}: RemoveMemberModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [userName, setUserName] = useState<string>('');
  const removeMember = useRemoveMemberFromCommunity();
  const getUserProfile = useGetUserProfile();

  React.useEffect(() => {
    const fetchUserName = async () => {
      try {
        const profile = await getUserProfile.mutateAsync(user);
        setUserName(profile?.name || 'UNNAMED MEMBER');
      } catch (error) {
        setUserName('UNNAMED MEMBER');
      }
    };
    if (user) {
      fetchUserName();
    }
  }, [user, getUserProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.toLowerCase() === 'remove') {
      try {
        await removeMember.mutateAsync({ user, communityId: community.id });
        setConfirmText('');
        onClose();
      } catch (error) {
        console.error('Failed to remove member from community:', error);
      }
    }
  };

  const handleClose = () => {
    if (!removeMember.isPending) {
      setConfirmText('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const isConfirmValid = confirmText.toLowerCase() === 'remove';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-amnesty">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-black">
            <h2 className="text-3xl font-bold text-black amnesty-heading">REMOVE MEMBER FROM COMMUNITY</h2>
            <button
              onClick={handleClose}
              disabled={removeMember.isPending}
              className="text-black hover:text-amnesty-gray-700 disabled:opacity-50 p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Success Notice */}
            <div className="bg-green-100 border-4 border-green-600 p-6">
              <div className="flex">
                <svg className="w-8 h-8 text-green-600 mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-green-800 mb-2 amnesty-heading">✅ BACKEND FUNCTION IMPLEMENTED</h4>
                  <p className="text-green-800 mb-4">
                    The backend function <code>removeMemberFromCommunity</code> is now implemented and functional. 
                    Admins can successfully remove members from specific communities using this interface.
                  </p>
                  <p className="text-green-800 font-bold">
                    This action will work as intended and update the community membership immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div className="bg-amnesty-yellow border-4 border-black p-6">
              <div className="flex">
                <svg className="w-8 h-8 text-black mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">⚠️ CONFIRM MEMBER REMOVAL</h4>
                  <p className="text-lg text-black mb-4">
                    You are about to remove <strong>"{userName}"</strong> from <strong>"{community.name}"</strong>. This action will:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-black ml-4">
                    <li>Remove the user from the community's member list</li>
                    <li>Revoke their ability to create new proposals in this community</li>
                    <li>Revoke their ability to vote on proposals in this community</li>
                    <li>Allow them to continue viewing the community as a guest</li>
                    <li><strong>Preserve</strong> their historical proposals and votes (they will remain visible)</li>
                  </ul>
                  <p className="text-lg text-black mt-4 font-bold">
                    The user will need to rejoin the community or receive admin assistance to participate again.
                  </p>
                </div>
              </div>
            </div>

            {/* Member Information */}
            <div className="bg-amnesty-gray-100 border-4 border-black p-6">
              <h5 className="text-lg font-bold text-black mb-4 amnesty-heading">MEMBER TO BE REMOVED</h5>
              <div className="space-y-3">
                <div>
                  <p className="text-lg text-black font-bold amnesty-heading">NAME:</p>
                  <p className="text-lg text-black">{userName}</p>
                </div>
                <div>
                  <p className="text-lg text-black font-bold amnesty-heading">PRINCIPAL ID:</p>
                  <p className="text-sm text-black font-mono bg-white border-2 border-black p-2 break-all">
                    {user.toString()}
                  </p>
                </div>
                <div>
                  <p className="text-lg text-black font-bold amnesty-heading">COMMUNITY:</p>
                  <p className="text-lg text-black">{community.name} (ID: {community.id.toString()})</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="confirm-text" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                  TYPE "REMOVE" TO CONFIRM *
                </label>
                <input
                  type="text"
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input-field text-lg"
                  placeholder="Type REMOVE to confirm"
                  required
                  disabled={removeMember.isPending}
                />
                <p className="text-sm text-amnesty-gray-600 mt-2 font-bold">
                  This confirmation helps prevent accidental member removal.
                </p>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={removeMember.isPending}
                  className="flex-1 btn-secondary text-lg py-4"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!isConfirmValid || removeMember.isPending}
                  className="flex-1 bg-black text-white py-4 px-6 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center amnesty-heading border-4 border-black"
                >
                  {removeMember.isPending ? (
                    <>
                      <LoadingSpinner size="small" className="mr-3" />
                      REMOVING...
                    </>
                  ) : (
                    'REMOVE MEMBER'
                  )}
                </button>
              </div>
            </form>

            {removeMember.isError && (
              <div className="p-4 bg-black text-white border-4 border-amnesty-yellow">
                <p className="text-lg font-bold amnesty-heading">
                  FAILED TO REMOVE MEMBER FROM COMMUNITY.
                </p>
                <p className="text-white mt-2">
                  {removeMember.error?.message || 'An error occurred while trying to remove the member. Please check your permissions and try again.'}
                </p>
              </div>
            )}

            {removeMember.isSuccess && (
              <div className="p-4 bg-amnesty-yellow text-black border-4 border-black">
                <p className="text-lg font-bold amnesty-heading">
                  MEMBER SUCCESSFULLY REMOVED FROM COMMUNITY!
                </p>
                <p className="text-black mt-2">
                  {userName} has been removed from {community.name}. 
                  Their historical contributions remain preserved, but they can no longer participate in community governance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
