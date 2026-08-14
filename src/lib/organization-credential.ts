import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const credentialVersion = "v1";
const credentialContext = "pong-ladder:organization-access-code:v1";

export class OrganizationCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganizationCredentialError";
  }
}

export function encryptOrganizationCredential(value: string, secret = getOrganizationCredentialSecret()) {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveCredentialKey(secret), initializationVector);
  cipher.setAAD(Buffer.from(credentialContext));
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authenticationTag = cipher.getAuthTag();

  return [
    credentialVersion,
    initializationVector.toString("base64url"),
    authenticationTag.toString("base64url"),
    ciphertext.toString("base64url")
  ].join(".");
}

export function decryptOrganizationCredential(payload: string, secret = getOrganizationCredentialSecret()) {
  const [version, encodedVector, encodedTag, encodedCiphertext, extra] = payload.split(".");

  if (version !== credentialVersion || !encodedVector || !encodedTag || !encodedCiphertext || extra) {
    throw new OrganizationCredentialError("The organization credential is not in a supported format.");
  }

  try {
    const initializationVector = Buffer.from(encodedVector, "base64url");
    const authenticationTag = Buffer.from(encodedTag, "base64url");
    const ciphertext = Buffer.from(encodedCiphertext, "base64url");

    if (initializationVector.length !== 12 || authenticationTag.length !== 16 || ciphertext.length === 0) {
      throw new Error("Invalid credential payload.");
    }

    const decipher = createDecipheriv("aes-256-gcm", deriveCredentialKey(secret), initializationVector);
    decipher.setAAD(Buffer.from(credentialContext));
    decipher.setAuthTag(authenticationTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    throw new OrganizationCredentialError("The organization credential could not be decrypted.");
  }
}

function deriveCredentialKey(secret: string) {
  if (!secret.trim()) {
    throw new OrganizationCredentialError("Organization credential encryption is not configured.");
  }

  return createHash("sha256").update(`${credentialContext}:${secret}`, "utf8").digest();
}

function getOrganizationCredentialSecret() {
  const secret =
    process.env.ORGANIZATION_CREDENTIAL_SECRET ||
    process.env.ORGANIZATION_ACCESS_CODE_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    process.env.SESSION_SECRET;

  if (!secret) {
    throw new OrganizationCredentialError("Organization credential encryption is not configured.");
  }

  return secret;
}
