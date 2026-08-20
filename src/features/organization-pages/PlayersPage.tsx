import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { requireOrganizationUser } from "@/lib/authz";
import { getPublicPlayerNames } from "@/lib/display-name";
import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getActiveSeason, getLadder, getUsers } from "@/lib/queries";
import { getTeamDisplayName } from "@/lib/team-display";
import { organizationPath } from "@/lib/organization-paths";

export default async function OrganizationPlayersPage({
  locale,
  organizationSlug
}: {
  locale: Locale;
  organizationSlug: string;
}) {
  const dictionary = getDictionary(locale);
  const { organization } = await requireOrganizationUser(
    organizationSlug,
    organizationPath(locale, organizationSlug, "players")
  );
  const [users, activeSeason] = await Promise.all([
    getUsers(organization.id),
    getActiveSeason(organization.id)
  ]);
  const ladder = activeSeason ? await getLadder(activeSeason.id) : [];
  const publicNames = getPublicPlayerNames(users);

  return (
    <main className="page-shell">
      <section className="section-band">
        <p className="label">{dictionary.players.label}</p>
        <h1 className="mt-1 text-3xl font-black">{dictionary.players.heading}</h1>

        <div className="mt-6 grid gap-3">
          {users.length === 0 ? (
            <EmptyState title={dictionary.players.emptyTitle} body={dictionary.players.emptyBody} />
          ) : (
            users.map((user) => {
              const ladderEntry = ladder.find((entry) => entry.userId === user.id);

              return (
                <Link
                  key={user.id}
                  href={organizationPath(locale, organizationSlug, "players", user.id)}
                  className="grid gap-3 rounded-lg border border-line bg-white p-4 transition hover:border-court-500 sm:grid-cols-[1fr_120px_120px]"
                >
                  <div>
                    <p className="font-black">{publicNames.get(user.id) ?? user.username}</p>
                    <p className="text-sm text-muted">{getTeamDisplayName(user)}</p>
                  </div>
                  <div>
                    <p className="stat-label">{dictionary.common.rank}</p>
                    <p className="font-bold">
                      {ladderEntry ? `#${ladderEntry.effectivePosition}` : dictionary.players.notJoined}
                    </p>
                  </div>
                  <div>
                    <p className="stat-label">{dictionary.common.points}</p>
                    <p className="font-bold">{formatNumber(ladderEntry?.points ?? 0, locale)}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
