"use client";

import Image from "next/image";
import { useState } from "react";

export function InviteSharePanel({
  organizationCode,
  invitationUrl,
  qrCodeDataUrl
}: {
  organizationCode: string;
  invitationUrl: string;
  qrCodeDataUrl: string;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid gap-5">
        <ShareValue
          label="Organization code"
          value={organizationCode}
          copyLabel="Copy code"
          valueClassName="text-xl tracking-[0.18em]"
        />
        <ShareValue label="Invitation link" value={invitationUrl} copyLabel="Copy link" />
      </div>
      <div className="rounded-xl border border-line bg-white p-4 text-center">
        <p className="label">Scan to join</p>
        <Image
          className="mx-auto mt-3 rounded-lg"
          src={qrCodeDataUrl}
          alt="QR code for the organization invitation link"
          width={256}
          height={256}
          unoptimized
        />
        <p className="mt-3 text-xs leading-5 text-muted">Open the camera app and scan this code.</p>
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
          {copied ? "Copied" : copyLabel}
        </button>
      </div>
    </div>
  );
}
