import { I18nextProvider } from 'react-i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LanguageSwitcher from '../../../frontend/src/components/LanguageSwitcher';
import { i18n } from '../../../frontend/src/i18n';

describe('LanguageSwitcher', () => {
  it('renders every supported language in native labels', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>,
    );

    expect(html).toContain('English');
    expect(html).toContain('العربية');
    expect(html).toContain('Français');
    expect(html).toContain('简体中文');
    expect(html).toContain('한국어');
  });

  it('can render in compact mode for app headers', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher compact />
      </I18nextProvider>,
    );

    expect(html).toContain('language-switcher--compact');
    expect(html).toContain('select');
  });
});
