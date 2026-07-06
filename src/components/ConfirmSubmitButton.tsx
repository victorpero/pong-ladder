"use client";

import type { ReactNode } from "react";

export function ConfirmSubmitButton({
  children,
  className,
  confirmation,
  disabled = false
}: {
  children: ReactNode;
  className: string;
  confirmation: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={className}
      disabled={disabled}
      type="submit"
      onClick={(event) => {
        if (!window.confirm(confirmation)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </button>
  );
}
