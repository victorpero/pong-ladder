import { describe, expect, it } from "vitest";
import {
  decryptOrganizationCredential,
  encryptOrganizationCredential,
  OrganizationCredentialError
} from "@/lib/organization-credential";

const secret = "organization-credential-test-secret-with-sufficient-entropy";

describe("organization credential encryption", () => {
  it("round-trips a credential without storing it as plaintext", () => {
    const encrypted = encryptOrganizationCredential("ABCD-2345-WXYZ", secret);

    expect(encrypted).not.toContain("ABCD-2345-WXYZ");
    expect(decryptOrganizationCredential(encrypted, secret)).toBe("ABCD-2345-WXYZ");
  });

  it("rejects tampering and the wrong secret", () => {
    const encrypted = encryptOrganizationCredential("ABCD-2345-WXYZ", secret);
    const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;

    expect(() => decryptOrganizationCredential(tampered, secret)).toThrow(OrganizationCredentialError);
    expect(() => decryptOrganizationCredential(encrypted, "different-secret")).toThrow(OrganizationCredentialError);
  });
});
