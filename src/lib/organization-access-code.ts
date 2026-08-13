import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

const accessCodeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const accessCodeLength = 12;

export function generateOrganizationAccessCode() {
  let rawCode = "";

  for (let index = 0; index < accessCodeLength; index += 1) {
    rawCode += accessCodeAlphabet[randomInt(0, accessCodeAlphabet.length)];
  }

  return rawCode.match(/.{1,4}/g)?.join("-") ?? rawCode;
}

export function normalizeOrganizationAccessCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, "");
}

export function hashOrganizationAccessCode(value: string, secret = getAccessCodeSecret()) {
  return createHmac("sha256", secret).update(normalizeOrganizationAccessCode(value), "utf8").digest("hex");
}

export function accessCodeHashesMatch(candidateHash: string, storedHash: string) {
  const candidate = Buffer.from(candidateHash, "hex");
  const stored = Buffer.from(storedHash, "hex");

  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function getAccessCodeSecret() {
  const secret = process.env.ORGANIZATION_ACCESS_CODE_SECRET || process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("Organization access-code hashing is not configured.");
  }

  return secret;
}
