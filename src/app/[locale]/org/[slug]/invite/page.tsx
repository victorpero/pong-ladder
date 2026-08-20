import type { Metadata } from "next";
import { KeyRound, LockKeyhole, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { InviteAdminControls } from "@/components/InviteAdminControls";
import { InviteSharePanel } from "@/components/InviteSharePanel";
import { getAppBaseUrl } from "@/lib/app-url";
import { requireOrganizationUser } from "@/lib/authz";
import { decryptOrganizationCredential, OrganizationCredentialError } from "@/lib/organization-credential";
import { canRotateOrganizationInvite, createOrganizationCodeInvitationUrl } from "@/lib/organization-invite";
import { toSupportedLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/format";
import { organizationPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }): Metadata {
  return { title: getDictionary(params.locale).metadata.inviteTitle };
}

export default async function OrganizationInvitePage({ params }: { params: { locale: string; slug: string } }) {
  const locale = toSupportedLocale(params.locale);
  const dictionary = getDictionary(locale);
  const invitePath = organizationPath(locale, params.slug, "invite");
  const { organization, membership } = await requireOrganizationUser(params.slug, invitePath);
  const isAdmin = canRotateOrganizationInvite(membership.role);
  const credential = readOrganizationCode(organization.accessCodeEnabled, organization.accessCodeCiphertext);
  const accessCode = credential.code;
  const invitationUrl = accessCode
    ? createOrganizationCodeInvitationUrl(getAppBaseUrl(), accessCode)
    : null;
  const qrCodeDataUrl = invitationUrl
    ? await QRCode.toDataURL(invitationUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 320,
        color: { dark: "#111827", light: "#ffffff" }
      })
    : null;

  return (
    <main className="page-shell">
      <section className="mb-6 max-w-3xl">
        <p className="label">{dictionary.invite.label}</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {t(dictionary.invite.heading, { organization: organization.name })}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">{dictionary.invite.intro}</p>
      </section>

      <section className="section-band max-w-5xl">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-court-50 text-court-700">
            <UserPlus aria-hidden="true" size={22} />
          </span>
          <div>
            <h2 className="text-2xl font-black">{dictionary.invite.shareHeading}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{dictionary.invite.shareBody}</p>
          </div>
        </div>

        {accessCode && invitationUrl && qrCodeDataUrl ? (
          <InviteSharePanel
            organizationCode={accessCode}
            invitationUrl={invitationUrl}
            qrCodeDataUrl={qrCodeDataUrl}
          />
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0 text-amber-800" size={21} />
              <div>
                <p className="font-black text-amber-900">
                  {credential.status === "missing"
                    ? dictionary.invite.noCodeHeading
                    : dictionary.invite.unavailableCodeHeading}
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">
                  {credential.status === "legacy"
                    ? dictionary.invite.legacyCodeBody
                    : credential.status === "unavailable"
                      ? dictionary.invite.unavailableCodeBody
                      : dictionary.invite.missingCodeBody}
                </p>
              </div>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-4 flex items-start gap-3">
              <KeyRound aria-hidden="true" className="mt-0.5 shrink-0 text-court-700" size={20} />
              <div>
                <h2 className="font-black">{dictionary.invite.adminHeading}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">{dictionary.invite.adminBody}</p>
              </div>
            </div>
            <InviteAdminControls
              organizationSlug={organization.slug}
              hasExistingCode={Boolean(organization.accessCodeHash)}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}

function readOrganizationCode(accessCodeEnabled: boolean, ciphertext: string | null) {
  if (!accessCodeEnabled) {
    return { code: null, status: "missing" as const };
  }

  if (!ciphertext) {
    return { code: null, status: "legacy" as const };
  }

  try {
    return { code: decryptOrganizationCredential(ciphertext), status: "available" as const };
  } catch (error) {
    if (error instanceof OrganizationCredentialError) {
      return { code: null, status: "unavailable" as const };
    }

    throw error;
  }
}
