import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useGetCallerUserProfile, useSaveCallerUserProfile } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { identity } = useInternetIdentity();
  const { data: profile, isLoading } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const [name, setName] = useState('');

  useEffect(() => {
    setName(profile?.name ?? '');
  }, [profile?.name]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await saveProfile.mutateAsync({ name: trimmed });
  };

  return (
    <section className="amnesty-panel bg-white p-8 md:p-10">
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr] xl:items-start">
        <div>
          <p className="amnesty-kicker text-amnesty-purple mb-4">{t('profile.page.kicker')}</p>
          <h1 className="max-w-3xl text-5xl text-amnesty-ink md:text-6xl amnesty-heading">
            {t('profile.page.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#38505d]">
            {t('profile.page.body')}
          </p>
        </div>

        <div className="border border-amnesty-line bg-[#f4f7f8] p-6">
          <p className="amnesty-kicker text-amnesty-blue mb-3">{t('profile.page.identityKicker')}</p>
          <p className="break-all text-base leading-7 text-amnesty-ink">
            {identity?.getPrincipal().toText() ?? t('common.labels.unknown')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 max-w-3xl space-y-6">
        <div>
          <label htmlFor="profile-name" className="mb-3 block text-lg text-amnesty-ink amnesty-heading">
            {t('profile.nameLabel')}
          </label>
          {isLoading ? (
            <div className="flex justify-center border border-amnesty-line bg-white py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              className="input-field text-lg"
              placeholder={t('profile.namePlaceholder')}
              disabled={saveProfile.isPending}
              required
            />
          )}
        </div>

        <button
          type="submit"
          disabled={!name.trim() || saveProfile.isPending || isLoading}
          className="btn-primary rounded-full"
        >
          {saveProfile.isPending ? t('common.loading.saving') : t('common.actions.save')}
        </button>

        {saveProfile.isError && (
          <div className="border border-amnesty-line bg-amnesty-ink p-4 text-white">
            <p className="text-lg amnesty-heading">{t('profile.saveError')}</p>
          </div>
        )}
      </form>
    </section>
  );
}
