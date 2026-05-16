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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-amnesty-ink/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[1.35rem] border border-amnesty-line bg-white shadow-[0_30px_90px_rgba(4,31,45,0.28)]">
        <div className="border-b border-amnesty-line px-6 py-6 sm:px-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="amnesty-kicker mb-5 text-amnesty-pink">
                {t('communities.create.kicker', { defaultValue: 'Create community' })}
              </p>
              <h2 className="text-4xl text-amnesty-ink md:text-5xl amnesty-heading">
                {t('communities.create.title')}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={createCommunity.isPending}
              className="rounded-full p-2 text-amnesty-ink transition hover:bg-[#f3f3ed] disabled:opacity-50"
              aria-label={t('common.actions.cancel')}
            >
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-8 px-6 py-7 sm:px-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-6">
              <div>
                <label htmlFor="community-name" className="amnesty-kicker mb-3 block text-amnesty-ink">
                  {t('communities.create.nameLabel')}
                </label>
                <input
                  type="text"
                  id="community-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field min-h-[3.75rem] rounded-[0.35rem] text-lg"
                  placeholder={t('communities.create.namePlaceholder')}
                  required
                  disabled={createCommunity.isPending}
                  maxLength={100}
                />
                <p className="mt-2 text-sm font-bold text-amnesty-gray-600">
                  {t('common.labels.characters', { count: name.length, max: 100 })}
                </p>
              </div>

              <div>
                <label htmlFor="community-policy" className="amnesty-kicker mb-3 block text-amnesty-ink">
                  {t('communities.create.policyLabel')}
                </label>
                <textarea
                  id="community-policy"
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  rows={6}
                  className="input-field rounded-[0.35rem] text-lg leading-7"
                  placeholder={t('communities.create.policyPlaceholder')}
                  required
                  disabled={createCommunity.isPending}
                  maxLength={500}
                />
                <p className="mt-2 text-sm font-bold text-amnesty-gray-600">
                  {t('common.labels.characters', { count: policy.length, max: 500 })}
                </p>
              </div>

              <div className="rounded-[0.7rem] border border-[#efe2a3] bg-[#fff9d8] p-5">
                <div className="flex gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amnesty-yellow text-amnesty-ink">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 0 0-4-4h-1M9 20H4v-2a4 4 0 0 1 4-4h1m0-4a4 4 0 1 1 8 0m-8 0a4 4 0 1 0 8 0" />
                    </svg>
                  </span>
                  <div>
                    <h4 className="text-xl text-amnesty-ink amnesty-heading">
                      {t('communities.create.panelTitle')}
                    </h4>
                    <p className="mt-2 text-base leading-7 text-amnesty-ink">
                      {t('communities.create.panelBody')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-[0.7rem] border border-amnesty-line bg-[#f8f8f3] p-6">
              <p className="amnesty-kicker mb-5 text-amnesty-green">{t('mainTabs.platformRoles')}</p>
              <div className="mb-5 text-5xl text-amnesty-ink amnesty-heading">1</div>
              <p className="text-base leading-7 text-[#38505d]">
                {t('mainTabs.platformRolesBody')}
              </p>
            </aside>
          </div>

          <div className="flex flex-col gap-3 border-t border-amnesty-line bg-[#fbfbf7] px-6 py-5 sm:flex-row sm:justify-end sm:px-10">
            <button
              type="button"
              onClick={handleClose}
              disabled={createCommunity.isPending}
              className="btn-secondary rounded-full"
            >
              {t('common.actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !policy.trim() || createCommunity.isPending}
              className="btn-primary rounded-full"
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
          <div className="mx-6 mb-6 rounded-[0.7rem] border border-amnesty-orange bg-[#fff1e8] p-4 text-amnesty-ink sm:mx-10">
            <p className="text-lg font-bold amnesty-heading">
              {t('communities.create.error')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
