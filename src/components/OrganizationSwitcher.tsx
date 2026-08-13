"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { organizationPath } from "@/lib/organization-paths";

type OrganizationOption = {
  slug: string;
  name: string;
  role: string;
};

export function OrganizationSwitcher({ currentSlug }: { currentSlug: string }) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/organizations", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { organizations: [] }))
      .then((data: { organizations: OrganizationOption[] }) => {
        if (!cancelled) {
          setOrganizations(data.organizations);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOrganizations([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const current = organizations.find((organization) => organization.slug === currentSlug);

  if (organizations.length <= 1) {
    return <span className="text-sm font-bold text-muted">{current?.name ?? currentSlug}</span>;
  }

  return (
    <select
      className="max-w-48 rounded-md border border-line bg-white px-2.5 py-2 text-sm font-bold text-ink outline-none focus:border-court-500"
      aria-label="Switch organization"
      value={currentSlug}
      onChange={(event) => router.push(organizationPath(event.target.value))}
    >
      {organizations.map((organization) => (
        <option key={organization.slug} value={organization.slug}>
          {organization.name}
        </option>
      ))}
    </select>
  );
}
