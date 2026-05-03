import { I18nextProvider } from 'react-i18next';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SiteFooter from '../../frontend/src/components/SiteFooter';
import { i18n } from '../../frontend/src/i18n';

describe('SiteFooter', () => {
  it('renders the shared landing footer content for reuse in authenticated screens', () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={i18n}>
        <SiteFooter />
      </I18nextProvider>,
    );

    expect(html).toContain('Community voice, visible accountability, and collective action');
    expect(html).toContain('Community');
    expect(html).toContain('Governance');
    expect(html).toContain('Action');
  });
});
