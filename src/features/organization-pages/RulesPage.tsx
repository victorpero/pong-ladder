import { requireOrganizationUser } from "@/lib/authz";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationRulesPage({
  locale,
  organizationSlug
}: {
  locale: Locale;
  organizationSlug: string;
}) {
  const dictionary = getDictionary(locale);
  await requireOrganizationUser(organizationSlug, organizationPath(locale, organizationSlug, "rules"));
  const rules = dictionary.rules;

  return (
    <main className="page-shell">
      <article className="section-band prose prose-stone max-w-none">
        <p className="label">{rules.label}</p>
        <h1 className="mt-1 text-3xl font-black">{rules.heading}</h1>

        <section className="mt-8 space-y-4 text-neutral">
          <h2 className="text-2xl font-black text-ink">{rules.challengeHeading}</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>{rules.challengeItems.window}</li>
            <li>{rules.challengeItems.declineOnce}</li>
            <li>{rules.challengeItems.secondDecline}</li>
          </ul>
        </section>

        <section className="mt-8 space-y-4 text-neutral">
          <h2 className="text-2xl font-black text-ink">{rules.formatHeading}</h2>
          <p>{rules.formatBestOfFive}</p>
          <p>{rules.formatValidResults}</p>
        </section>

        <section className="mt-8 space-y-4 text-neutral">
          <h2 className="text-2xl font-black text-ink">{rules.scoringHeading}</h2>
          <p>{rules.scoringSetValue}</p>
          <p>{rules.scoringHigherRanked}</p>
          <p>{rules.scoringLowerRanked}</p>
          <div className="rounded-lg border border-line bg-white p-4">
            <ul className="list-disc space-y-2 pl-5">
              <li>{rules.scoringExamples.threeZero}</li>
              <li>{rules.scoringExamples.threeOne}</li>
              <li>{rules.scoringExamples.threeTwo}</li>
            </ul>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="text-lg font-black">{rules.exampleOneHeading}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral">{rules.exampleOneBody}</p>
            <p className="mt-3 text-sm font-semibold text-ink">{rules.exampleOneWinner}</p>
            <p className="text-sm font-semibold text-ink">{rules.exampleOneLoser}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="text-lg font-black">{rules.exampleTwoHeading}</h3>
            <p className="mt-3 text-sm leading-6 text-neutral">{rules.exampleTwoBody}</p>
            <p className="mt-3 text-sm font-semibold text-ink">{rules.exampleTwoWinner}</p>
            <p className="text-sm font-semibold text-ink">{rules.exampleTwoLoser}</p>
          </div>
        </section>

        <section className="mt-8 space-y-4 text-neutral">
          <h2 className="text-2xl font-black text-ink">{rules.whyPlayHeading}</h2>
          <p>{rules.whyPlayBody}</p>
        </section>
      </article>
    </main>
  );
}
