import { KeyRound, LockKeyhole, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { InviteAdminControls } from "@/components/InviteAdminControls";
import { InviteSharePanel } from "@/components/InviteSharePanel";
import { getAppBaseUrl } from "@/lib/app-url";
import { requireOrganizationUser } from "@/lib/authz";
import { decryptOrganizationCredential, OrganizationCredentialError } from "@/lib/organization-credential";
import { canRotateOrganizationInvite, createOrganizationCodeInvitationUrl } from "@/lib/organization-invite";
import { organizationPath } from "@/lib/organization-paths";

export const dynamic = "force-dynamic";

export default async function OrganizationInvitePage({ params }: { params: { slug: string } }) {
  const invitePath = organizationPath(params.slug, "invite");
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
        <p className="label">Invite</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Invite people to {organization.name}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Share the organization code, copy the invitation link, or let someone scan the QR code.
        </p>
      </section>

      <section className="section-band max-w-5xl">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-court-50 text-court-700">
            <UserPlus aria-hidden="true" size={22} />
          </span>
          <div>
            <h2 className="text-2xl font-black">Share access</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              The code and link grant active organization membership to a verified account.
            </p>
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
                  {credential.status === "missing" ? "No organization code is available" : "The current code cannot be displayed"}
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900/80">
                  {credential.status === "legacy"
                    ? "This organization has an older hash-only code. An administrator must rotate it once before members can share it."
                    : credential.status === "unavailable"
                      ? "The encrypted credential is unavailable. An administrator must verify the encryption configuration and rotate the code."
                      : "An administrator must generate a code before members can share it."}
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
                <h2 className="font-black">Administrator controls</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Rotation immediately invalidates the previous code, invitation link, and QR code.
                </p>
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
