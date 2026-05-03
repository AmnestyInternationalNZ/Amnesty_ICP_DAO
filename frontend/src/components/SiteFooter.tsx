import { useTranslation } from 'react-i18next';
import AmnestyLogo from './AmnestyLogo';

function StatementBand() {
  const { t } = useTranslation();

  return (
    <section className="bg-amnesty-yellow">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="mx-auto max-w-5xl text-3xl font-bold leading-tight text-amnesty-ink md:text-5xl amnesty-heading">
          {t('app.landing.statement')}
        </p>
      </div>
    </section>
  );
}

export default function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="mt-20">
      <StatementBand />
      <div className="bg-amnesty-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr] lg:px-8">
          <div className="space-y-5">
            <AmnestyLogo className="max-w-[11rem]" imageClassName="w-full" />
            <p className="max-w-sm text-base leading-7 text-white/74">
              {t('app.footer.intro')}
            </p>
          </div>

          <div>
            <p className="mb-5 text-xl text-white amnesty-heading">{t('app.footer.communityTitle')}</p>
            <p className="text-base leading-7 text-white/74">
              {t('app.footer.communityBody')}
            </p>
          </div>

          <div>
            <p className="mb-5 text-xl text-white amnesty-heading">{t('app.footer.governanceTitle')}</p>
            <p className="text-base leading-7 text-white/74">
              {t('app.footer.governanceBody')}
            </p>
          </div>

          <div>
            <p className="mb-5 text-xl text-white amnesty-heading">{t('app.footer.actionTitle')}</p>
            <p className="text-base leading-7 text-white/74">
              {t('app.footer.actionBody')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
