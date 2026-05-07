import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalePreference } from '../i18n/preferences';

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export default function LanguageSwitcher({ className = '', compact = false }: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { locale, localeDefinitions, setLocale } = useLocalePreference();

  return (
    <label className={`language-switcher ${compact ? 'language-switcher--compact' : ''} ${className}`.trim()}>
      <span className="language-switcher__label">{t('i18n.language.label')}</span>
      <select
        aria-label={t('i18n.language.label')}
        className="language-switcher__select"
        value={locale}
        onChange={(event) => {
          void setLocale(event.currentTarget.value as typeof locale);
        }}
      >
        {localeDefinitions.map((definition) => (
          <option key={definition.code} value={definition.code}>
            {definition.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
