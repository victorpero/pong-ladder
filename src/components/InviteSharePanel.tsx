"use client";

import Image from "next/image";
import { useState } from "react";
import { useDictionary } from "@/lib/i18n/locale-context";

export function InviteSharePanel({
  organizationCode,
  invitationUrl,
  qrCodeDataUrl
}: {
  organizationCode: string;
  invitationUrl: string;
  qrCodeDataUrl: string;
}) {
  const dictionary = useDictionary();

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-5">
        <ShareValue
          label={dictionary.invite.organizationCodeLabel}
          value={organizationCode}
          copyLabel={dictionary.invite.copyCode}
          valueClassName="text-xl tracking-[0.18em]"
        />
        <ShareValue
          label={dictionary.invite.invitationLinkLabel}
          value={invitationUrl}
          copyLabel={dictionary.invite.copyLink}
        />
      </div>
      <div className="rounded-xl border border-line bg-white p-4 text-center">
        <p className="label">{dictionary.invite.scanHeading}</p>
        <Image
          className="mx-auto mt-3 rounded-lg"
          src={qrCodeDataUrl}
          alt={dictionary.invite.qrCodeAlt}
          width={256}
          height={256}
          unoptimized
        />
        <p className="mt-3 text-xs leading-5 text-muted">{dictionary.invite.scanHelp}</p>
      </div>
    </div>
  );
}

function ShareValue({
  label,
  value,
  copyLabel,
  valueClassName = "text-sm"
}: {
  label: string;
  value: string;
  copyLabel: string;
  valueClassName?: string;
}) {
  const dictionary = useDictionary();
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <p className="label">{label}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <input
          className={`field min-w-0 font-mono font-black ${valueClassName}`}
          aria-label={label}
          readOnly
          value={value}
        />
        <button
          className="button-secondary"
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? dictionary.common.copied : copyLabel}
        </button>
      </div>
    </div>
  );
}
