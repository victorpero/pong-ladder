import Link from "next/link";
import { ReleaseAcknowledgement } from "@/components/ReleaseAcknowledgement";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import { formatReleaseDate, getReleases, releaseChangeGroups } from "@/lib/release-notes";
import { productName } from "@/lib/version";

export default function ChangelogPage({
  locale,
  backHref,
  backLabel
}: {
  locale: Locale;
  backHref: string;
  backLabel: string;
}) {
  const dictionary = getDictionary(locale);
  const releases = getReleases();
  const [currentRelease] = releases;

  return (
    <main className="page-shell">
      <ReleaseAcknowledgement version={currentRelease.version} />

      <section className="section-band">
        <p className="label">{dictionary.changelog.label}</p>
        <h1 className="mt-1 text-3xl font-black">
          {productName} v{currentRelease.version}
        </h1>
        <p className="mt-2 text-sm font-semibold text-muted">
          {t(dictionary.changelog.released, { date: formatReleaseDate(currentRelease.date, locale) })}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{dictionary.changelog.intro}</p>
        <Link className="button-secondary mt-4 inline-flex" href={backHref}>
          {backLabel}
        </Link>
      </section>

      <div className="mt-6 grid gap-4">
        {releases.map((release) => (
          <section key={release.version} className="section-band">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-black">v{release.version}</h2>
              <p className="text-sm font-semibold text-muted">{formatReleaseDate(release.date, locale)}</p>
            </div>

            {release.summary ? (
              <p className="mt-2 text-sm leading-6 text-muted">{release.summary[locale]}</p>
            ) : null}

            <div className="mt-4 grid gap-4">
              {releaseChangeGroups.map((group) => {
                const items = release.changes[group];

                if (!items) {
                  return null;
                }

                return (
                  <div key={group}>
                    <p className="stat-label">{dictionary.changelog.groups[group]}</p>
                    <ul className="mt-2 grid list-disc gap-2 pl-5 text-sm leading-6">
                      {items.map((item) => (
                        <li key={item[locale]}>{item[locale]}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
