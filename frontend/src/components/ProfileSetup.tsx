import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

export default function ProfileSetup() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      saveProfile.mutate({ name: name.trim() });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="amnesty-panel p-10 md:p-12 bg-white">
        <div className="text-center mb-8">
          <p className="amnesty-kicker text-amnesty-purple mb-4">{t('profile.kicker')}</p>
          <div className="w-24 h-24 bg-amnesty-yellow flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h2 className="text-5xl font-bold text-amnesty-ink mb-4 amnesty-heading">{t('profile.title')}</h2>
          <p className="amnesty-serif text-xl text-amnesty-ink max-w-xl mx-auto">
            {t('profile.body')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-lg font-bold text-amnesty-ink mb-3 amnesty-heading">
              {t('profile.nameLabel')}
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-lg"
              placeholder={t('profile.namePlaceholder')}
              required
              disabled={saveProfile.isPending}
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || saveProfile.isPending}
            className="w-full btn-primary text-xl py-4 flex items-center justify-center"
          >
            {saveProfile.isPending ? (
              <>
                <LoadingSpinner size="small" className="mr-3" />
                {t('common.loading.saving')}
              </>
            ) : (
              t('common.actions.continue')
            )}
          </button>
        </form>

        {saveProfile.isError && (
          <div className="mt-6 border border-amnesty-line bg-amnesty-ink p-4 text-white">
            <p className="text-lg font-bold amnesty-heading">
              {t('profile.saveError')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
