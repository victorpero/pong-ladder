import Link from "next/link";
import { headers } from "next/headers";
import { ACTIVE_PATH_HEADER, localeFromPathname, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { organizationsPath } from "@/lib/organization-paths";

export default function OrganizationNotFound() {
  const locale = localeFromPathname(headers().get(ACTIVE_PATH_HEADER) ?? "") ?? DEFAULT_LOCALE;
  const dictionary = getDictionary(locale);

  return (
    <main className="page-shell">
      <section className="section-band mx-auto max-w-xl text-center">
        <p className="label">{dictionary.organizationNotFound.label}</p>
        <h1 className="mt-2 text-3xl font-black">{dictionary.organizationNotFound.heading}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{dictionary.organizationNotFound.body}</p>
        <Link className="button mt-5" href={organizationsPath(locale)}>
          {dictionary.common.backToOrganizations}
        </Link>
      </section>
    </main>
  );
}
