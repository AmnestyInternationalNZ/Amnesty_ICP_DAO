import React, { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import LoadingSpinner from './LoadingSpinner';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      saveProfile.mutate({ name: name.trim() });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border-4 border-black p-12 shadow-amnesty">
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-amnesty-yellow border-4 border-black flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-black" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-black mb-4 amnesty-heading">WELCOME!</h2>
          <p className="text-xl text-black">Please tell us your name to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-lg font-bold text-black mb-3 amnesty-heading">
              YOUR NAME
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-lg"
              placeholder="Enter your name"
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
                SAVING...
              </>
            ) : (
              'CONTINUE'
            )}
          </button>
        </form>

        {saveProfile.isError && (
          <div className="mt-6 p-4 bg-black text-white border-4 border-amnesty-yellow">
            <p className="text-lg font-bold amnesty-heading">
              FAILED TO SAVE PROFILE. PLEASE TRY AGAIN.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
