import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLeaveCommunity } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

interface LeaveCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: bigint;
  communityName: string;
  onSuccess: () => void;
}

export default function LeaveCommunityModal({ 
  isOpen, 
  onClose, 
  communityId, 
  communityName, 
  onSuccess 
}: LeaveCommunityModalProps) {
  const { t } = useTranslation();
  const [confirmText, setConfirmText] = useState('');
  const leaveCommunity = useLeaveCommunity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.toLowerCase() === 'leave') {
      try {
        await leaveCommunity.mutateAsync(communityId);
        setConfirmText('');
        onClose();
        onSuccess(); // Navigate back to communities list
      } catch (error) {
        console.error('Failed to leave community:', error);
      }
    }
  };

  const handleClose = () => {
    if (!leaveCommunity.isPending) {
      setConfirmText('');
      onClose();
    }
  };

  if (!isOpen) return null;

  const isConfirmValid = confirmText.toLowerCase() === 'leave';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-amnesty">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-black">
            <h2 className="text-3xl font-bold text-black amnesty-heading">{t('communities.leave.title')}</h2>
            <button
              onClick={handleClose}
              disabled={leaveCommunity.isPending}
              className="text-black hover:text-amnesty-gray-700 disabled:opacity-50 p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Warning Message */}
            <div className="bg-amnesty-yellow border-4 border-black p-6">
              <div className="flex">
                <svg className="w-8 h-8 text-black mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">{t('communities.leave.warningTitle')}</h4>
                  <p className="text-lg text-black mb-4">
                    {t('communities.leave.warningIntro', { communityName })}
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-black ml-4">
                    <li>{t('communities.leave.bulletRemove')}</li>
                    <li>{t('communities.leave.bulletViewer')}</li>
                    <li>{t('communities.leave.bulletProposal')}</li>
                    <li>{t('communities.leave.bulletVote')}</li>
                    <li>{t('communities.leave.bulletBrowse')}</li>
                    <li>{t('communities.leave.bulletPreserve')}</li>
                  </ul>
                  <p className="text-lg text-black mt-4 font-bold">
                    {t('communities.leave.warningOutro')}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="confirm-text" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                  {t('communities.leave.confirmLabel')}
                </label>
                <input
                  type="text"
                  id="confirm-text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="input-field text-lg"
                  placeholder={t('communities.leave.confirmPlaceholder')}
                  required
                  disabled={leaveCommunity.isPending}
                />
                <p className="text-sm text-amnesty-gray-600 mt-2 font-bold">
                  {t('communities.leave.confirmHelp')}
                </p>
              </div>

              <div className="flex space-x-4 pt-6">
                <button
                type="button"
                onClick={handleClose}
                disabled={leaveCommunity.isPending}
                className="flex-1 btn-secondary text-lg py-4"
              >
                {t('common.actions.cancel')}
              </button>
                <button
                  type="submit"
                  disabled={!isConfirmValid || leaveCommunity.isPending}
                  className="flex-1 bg-black text-white py-4 px-6 font-bold uppercase tracking-wide hover:bg-amnesty-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center amnesty-heading border-4 border-black"
                >
                  {leaveCommunity.isPending ? (
                    <>
                      <LoadingSpinner size="small" className="mr-3" />
                      {t('common.loading.leaving')}
                    </>
                  ) : (
                    t('common.actions.leaveCommunity')
                  )}
                </button>
              </div>
            </form>

            {leaveCommunity.isError && (
              <div className="p-4 bg-black text-white border-4 border-amnesty-yellow">
                <p className="text-lg font-bold amnesty-heading">
                  {t('communities.leave.errorTitle')}
                </p>
                <p className="text-white mt-2">
                  {t('communities.leave.errorBody')}
                </p>
              </div>
            )}

            {leaveCommunity.isSuccess && (
              <div className="p-4 bg-amnesty-yellow text-black border-4 border-black">
                <p className="text-lg font-bold amnesty-heading">
                  {t('communities.leave.successTitle')}
                </p>
                <p className="text-black mt-2">
                  {t('communities.leave.successBody')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
