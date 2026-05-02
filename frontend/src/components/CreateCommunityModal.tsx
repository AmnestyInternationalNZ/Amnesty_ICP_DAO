import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCreateCommunity } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [policy, setPolicy] = useState('');
  const createCommunity = useCreateCommunity();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && policy.trim()) {
      try {
        await createCommunity.mutateAsync({ name: name.trim(), policy: policy.trim() });
        setName('');
        setPolicy('');
        onClose();
      } catch (error) {
        console.error('Failed to create community:', error);
      }
    }
  };

  const handleClose = () => {
    if (!createCommunity.isPending) {
      setName('');
      setPolicy('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-amnesty-yellow max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-amnesty-yellow">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-black">
            <h2 className="text-3xl font-bold text-black amnesty-heading">{t('communities.create.title')}</h2>
            <button
              onClick={handleClose}
              disabled={createCommunity.isPending}
              className="text-black hover:text-amnesty-gray-700 disabled:opacity-50 p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="community-name" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                {t('communities.create.nameLabel')}
              </label>
              <input
                type="text"
                id="community-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field text-lg"
                placeholder={t('communities.create.namePlaceholder')}
                required
                disabled={createCommunity.isPending}
                maxLength={100}
              />
              <p className="text-sm text-amnesty-gray-600 mt-2 font-bold">{t('common.labels.characters', { count: name.length, max: 100 })}</p>
            </div>

            <div>
              <label htmlFor="community-policy" className="block text-lg font-bold text-black mb-3 amnesty-heading">
                {t('communities.create.policyLabel')}
              </label>
              <textarea
                id="community-policy"
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                rows={6}
                className="input-field text-lg resize-none"
                placeholder={t('communities.create.policyPlaceholder')}
                required
                disabled={createCommunity.isPending}
                maxLength={500}
              />
              <p className="text-sm text-amnesty-gray-600 mt-2 font-bold">{t('common.labels.characters', { count: policy.length, max: 500 })}</p>
            </div>

            <div className="bg-amnesty-yellow border-4 border-black p-6">
              <div className="flex">
                <svg className="w-8 h-8 text-black mt-1 mr-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <div>
                  <h4 className="text-lg font-bold text-black mb-2 amnesty-heading">{t('communities.create.panelTitle')}</h4>
                  <p className="text-lg text-black">
                    {t('communities.create.panelBody')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={handleClose}
                disabled={createCommunity.isPending}
                className="flex-1 btn-secondary text-lg py-4"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !policy.trim() || createCommunity.isPending}
                className="flex-1 btn-primary text-lg py-4 flex items-center justify-center"
              >
                {createCommunity.isPending ? (
                  <>
                    <LoadingSpinner size="small" className="mr-3" />
                    {t('common.loading.creating')}
                  </>
                ) : (
                  t('common.actions.createCommunity')
                )}
              </button>
            </div>
          </form>

          {createCommunity.isError && (
            <div className="mt-6 p-4 bg-black text-white border-4 border-amnesty-yellow">
              <p className="text-lg font-bold amnesty-heading">
                {t('communities.create.error')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
