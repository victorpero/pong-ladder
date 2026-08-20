import type { MetadataRoute } from "next";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { APP_THEME_COLOR } from "@/lib/app-metadata";

/**
 * Icons are generated from `public/images/logo.png` by `npm run icons:generate`,
 * so the installed app uses the same mark as the in-app header.
 *
 * The `maskable` variants carry extra padding: launchers may crop an icon to the
 * central 80% circle, and the plain `any` variants are framed too tightly for
 * that. Both purposes are declared separately rather than as a combined
 * `"any maskable"` entry, which would let a launcher crop the tight artwork.
 *
 * One manifest serves every language, so it describes the app in the product's
 * default locale. `start_url` stays unprefixed and lets the middleware send the
 * reader to their own language, exactly as it does for a normal first visit.
 */
export default function manifest(): MetadataRoute.Manifest {
  const dictionary = getDictionary(DEFAULT_LOCALE);

  return {
    name: dictionary.metadata.title,
    short_name: dictionary.metadata.title,
    description: dictionary.metadata.description,
    start_url: "/",
    display: "standalone",
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
