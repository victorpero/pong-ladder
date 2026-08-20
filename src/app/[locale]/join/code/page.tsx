import type { Metadata } from "next";
import { OrganizationCodeRedemption } from "@/components/OrganizationCodeRedemption";
import { LogoMark } from "@/components/LogoMark";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.invitationTitle };
}

export default function OrganizationCodeInvitationPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-lg items-center justify-center">
        <section className="section-band w-full text-center">
          <div className="mb-5 flex justify-center">
            <LogoMark />
          </div>
          <OrganizationCodeRedemption />
        </section>
      </div>
    </main>
  );
}
