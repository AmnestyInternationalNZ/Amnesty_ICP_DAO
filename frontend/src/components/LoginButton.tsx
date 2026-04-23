import React from 'react';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const text = loginStatus === 'logging-in' ? 'LOGGING IN...' : isAuthenticated ? 'LOGOUT' : 'LOGIN';

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message === 'User is already authenticated') {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <button
      onClick={handleAuth}
      disabled={disabled}
      className={`px-8 py-3 font-bold uppercase tracking-wide transition-all duration-200 border-4 ${
        isAuthenticated
          ? 'bg-black text-white border-white hover:bg-amnesty-gray-800'
          : 'bg-amnesty-yellow text-black border-black hover:bg-yellow-300'
      } disabled:opacity-50 amnesty-heading`}
    >
      {text}
    </button>
  );
}
