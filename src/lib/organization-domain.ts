import { domainToASCII } from "node:url";

export function normalizeEmailDomain(value: string) {
  const ascii = domainToASCII(value.trim().toLowerCase().replace(/\.$/, ""));

  if (
    !ascii ||
    ascii.length > 253 ||
    !ascii.includes(".") ||
    ascii.split(".").some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  ) {
    return null;
  }

  return ascii;
}

export function emailDomain(email: string) {
  const separator = email.lastIndexOf("@");

  if (separator <= 0 || separator === email.length - 1) {
    return null;
  }

  return normalizeEmailDomain(email.slice(separator + 1));
}

export function emailMatchesDomains(email: string, allowedDomains: string[]) {
  const candidate = emailDomain(email);

  return Boolean(candidate && allowedDomains.some((domain) => normalizeEmailDomain(domain) === candidate));
}

export function normalizeEmailDomains(values: string[]) {
  return Array.from(new Set(values.map(normalizeEmailDomain).filter((domain): domain is string => Boolean(domain))));
}
