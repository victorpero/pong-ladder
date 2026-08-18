"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { LogoMark } from "@/components/LogoMark";
import { resumePendingInvitationAction } from "@/lib/organization-invitation-actions";
import { organizationsPath } from "@/lib/organization-paths";

export function PendingInvitationResumption() {
  const router = useRouter();
  const started = useRef(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    startTransition(async () => {
      const resumption = await resumePendingInvitationAction();

      if (resumption.outcome === "redeemed" || resumption.outcome === "already_member") {
        router.replace(`${organizationsPath}?joined=${encodeURIComponent(resumption.organizationSlug)}`);
      } else if (resumption.outcome === "none" || resumption.outcome === "authentication_required") {
        router.replace(organizationsPath);
      } else {
        router.replace(`${organizationsPath}?invitation=${encodeURIComponent(resumption.outcome)}`);
      }

      router.refresh();
    });
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-court-50 text-court-700">
            <Building2 aria-hidden="true" size={24} />
          </span>
          <p className="label mt-5">Organization invitation</p>
          <h1 className="mt-2 text-3xl font-black">Finishing your invitation</h1>
          <div className="mt-6 rounded-lg bg-court-50 p-4">
            <p className="font-black text-court-700">
              {pending ? "Accepting invitation..." : "Preparing invitation..."}
            </p>
            <p className="mt-1 text-sm text-muted">Your membership will be activated automatically.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
