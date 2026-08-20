import { cookies, headers } from "next/headers";
import {
  LOCALE_COOKIE_NAME,
  isSupportedLocale,
  resolveLocale,
  type Locale
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";

/**
 * The locale for work that has no route parameter to read, such as a server action responding to a
 * form post. Middleware keeps this cookie in step with the locale segment of the current page.
 */
export function getRequestLocale(): Locale {
  const cookieLocale = cookies().get(LOCALE_COOKIE_NAME)?.value;

  if (isSupportedLocale(cookieLocale)) {
    return cookieLocale;
  }

  return resolveLocale({ acceptLanguage: headers().get("accept-language") });
}

/** Dictionary for server actions and other server code outside the locale layout. */
export function getRequestDictionary() {
  return getDictionary(getRequestLocale());
}
