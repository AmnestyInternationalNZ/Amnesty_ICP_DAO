import React from 'react';
import { useTranslation } from 'react-i18next';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';

interface LoginButtonProps {
  className?: string;
  compact?: boolean;
}

export default function LoginButton({ className = '', compact = false }: LoginButtonProps) {
  const { t } = useTranslation();
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === 'logging-in';
  const text =
    loginStatus === 'logging-in'
      ? t('auth.action.loggingIn')
      : isAuthenticated
        ? t('auth.action.logout')
        : t('auth.action.login');

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
      className={`${
        isAuthenticated ? 'btn-inverted' : 'btn-primary'
      } ${compact ? 'px-5 py-2 text-sm md:text-base' : 'px-8 py-4 text-base md:text-lg'} ${className}`.trim()}
    >
      {text}
    </button>
  );
}
