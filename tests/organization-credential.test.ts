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
    const segments = encrypted.split(".");
    const ciphertext = Buffer.from(segments[3], "base64url");
    ciphertext[0] ^= 1;
    segments[3] = ciphertext.toString("base64url");
    const tampered = segments.join(".");

    expect(() => decryptOrganizationCredential(tampered, secret)).toThrow(OrganizationCredentialError);
    expect(() => decryptOrganizationCredential(encrypted, "different-secret")).toThrow(OrganizationCredentialError);
  });
});
